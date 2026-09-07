import { getActorsPageData } from "@/lib/threatactors";
import { getWireMentions } from "@/lib/actor-wire";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";
import { etagFor, notModified } from "@/lib/etag";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /api/v1/actors — the adversary roster as data. No key, no signup.
//
// The first thing a founder-reviewer asked for: the dossiers exist as pages
// but not as an endpoint, so nobody could join a CVE or a story to an actor
// programmatically. This is the lean index (the same hourly blob that drives
// /actors); the full dossier is one hop away at /api/v1/actors/{id}.
// ---------------------------------------------------------------------------
const MAX_LIMIT = 500;

export async function GET(req: Request) {
  if (!rateLimit(`apiv1actors:${clientIp(req)}`, 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  const q = new URL(req.url).searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(q.get("limit") ?? "100", 10) || 100));
  const needle = (q.get("q") ?? "").trim().toLowerCase();
  const type = (q.get("type") ?? "").trim().toLowerCase();
  const origin = (q.get("origin") ?? "").trim().toUpperCase();
  if (type && type !== "nation-state" && type !== "crime" && type !== "unknown") {
    return jsonError(400, "`type` must be one of: nation-state, crime, unknown");
  }

  let data, wire;
  try {
    [data, wire] = await Promise.all([getActorsPageData(), getWireMentions()]);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not an empty roster.");
  }
  const onWire = new Map(wire.recent.map((r) => [r.id, r.count]));

  let rows = data.index;
  if (type) rows = rows.filter((a) => a.type === type);
  if (origin) rows = rows.filter((a) => (a.origin ?? "").toUpperCase() === origin);
  if (needle)
    rows = rows.filter(
      (a) => a.name.toLowerCase().includes(needle) || a.aliases.some((x) => x.toLowerCase().includes(needle))
    );

  const actors = rows.slice(0, limit).map((a) => ({
    id: a.id,
    name: a.name,
    url: absoluteUrl(`/actors/${a.id}`),
    api_url: absoluteUrl(`/api/v1/actors/${a.id}`),
    type: a.type,
    origin: a.origin, // ISO-2 as the source states it; null when it doesn't
    aliases: a.aliases,
    on_wire_90d: onWire.get(a.id) ?? 0,
  }));

  const body = JSON.stringify(
    {
      schema: "https://skopnix.com/api/v1/actors",
      version: 1,
      generated_at: new Date().toISOString(),
      count: actors.length,
      total_matching: rows.length,
      roster_refreshed: data.stats.lastRefreshed ?? null,
      filters: { q: needle || null, type: type || null, origin: origin || null, limit },
      actors,
    },
    null,
    2
  );
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
