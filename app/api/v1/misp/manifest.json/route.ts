import { getMispActors } from "@/lib/cited-data";
import { manifestEntry, mispEventUuid, type ManifestEntry } from "@/lib/misp";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { etagFor, notModified } from "@/lib/etag";
import { ttlMemo } from "@/lib/memo";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /api/v1/misp/manifest.json — the MISP feed index. Add
// https://skopnix.com/api/v1/misp as a feed (format: MISP Feed) and MISP
// reads this, then fetches /api/v1/misp/{uuid}.json for each event whose
// timestamp moved: one event per actor with cited indicators or CVEs.
// ---------------------------------------------------------------------------
const buildBody = ttlMemo(async (): Promise<string> => {
  const actors = await getMispActors();
  const manifest: Record<string, ManifestEntry> = {};
  for (const { actor, latest } of actors) manifest[mispEventUuid(actor._id)] = manifestEntry(actor, latest);
  return JSON.stringify(manifest, null, 2);
}, 300_000, 1);

export async function GET(req: Request) {
  if (!limitCaller(req, "apiv1misp", 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  let body: string;
  try {
    body = await buildBody();
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not an empty feed.");
  }
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
