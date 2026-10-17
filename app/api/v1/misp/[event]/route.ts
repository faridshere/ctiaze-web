import { getMispActors, getMispRows } from "@/lib/cited-data";
import { mispEvent, mispEventUuid } from "@/lib/misp";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { etagFor, notModified } from "@/lib/etag";
import { ttlMemo } from "@/lib/memo";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /api/v1/misp/{uuid}.json — one MISP feed event: an actor's cited
// indicators and CVEs, the quoted sentence and source URL in each attribute's
// comment (lib/misp.ts). The uuid is the one manifest.json lists.
// ---------------------------------------------------------------------------
const UUID_JSON = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.json$/;

// uuid → actor, from the same read as the manifest: only actors the manifest
// lists have an event, and the uuid is not reversible on its own.
const actorIndex = ttlMemo(async () => {
  const actors = await getMispActors();
  return new Map(actors.map((a) => [mispEventUuid(a.actor._id), a]));
}, 300_000, 1);

const buildBody = ttlMemo(async (uuid: string): Promise<string | null> => {
  const entry = (await actorIndex()).get(uuid);
  if (!entry) return null;
  const { cves, iocs } = await getMispRows(entry.actor._id);
  // Stamped with the manifest's instant for this actor, so MISP sees no change
  // between the two and does not re-fetch the event on every pull.
  return JSON.stringify(mispEvent(entry.actor, cves, iocs, entry.latest), null, 2);
}, 300_000, 64);

export async function GET(req: Request, ctx: { params: Promise<{ event: string }> }) {
  if (!limitCaller(req, "apiv1misp", 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  const { event } = await ctx.params;
  const m = UUID_JSON.exec(decodeURIComponent(event).toLowerCase());
  if (!m) return jsonError(404, "Not a feed event. The index is /api/v1/misp/manifest.json.");

  let body: string | null;
  try {
    body = await buildBody(m[1]);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not a missing event.");
  }
  if (!body) return jsonError(404, "No such event. The index is /api/v1/misp/manifest.json.");
  const etag = etagFor(body);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      ETag: etag,
    },
  });
}
