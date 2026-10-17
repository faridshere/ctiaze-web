import { getClaims, getClaimStats } from "@/lib/claims";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { etagFor, notModified } from "@/lib/etag";
import { ttlMemo } from "@/lib/memo";

export const revalidate = 300;

// ---------------------------------------------------------------------------
// GET /api/v1/claims — hacktivist and leak-site claims against Azerbaijan, with
// the reality check the watch ran when it saw them. No key, no signup.
// Every row is a CLAIM by a third party, never a confirmed incident.
// ---------------------------------------------------------------------------
const MAX_LIMIT = 500;

const buildBody = ttlMemo(async (limit: number): Promise<string> => {
  const [claims, stats] = await Promise.all([getClaims(limit), getClaimStats()]);
  return JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      note: "Each row is a claim made by a third party (hacktivist channel, tracker or leak site). checks = our own reachability probe and check-host.net, run when the claim was seen.",
      stats_30d: stats,
      count: claims.length,
      claims,
    },
    null,
    2
  );
}, 120_000, 8);

export async function GET(req: Request) {
  if (!limitCaller(req, "apiv1claims", 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  const q = new URL(req.url).searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(q.get("limit") ?? "100", 10) || 100));
  let body: string;
  try {
    body = await buildBody(limit);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not an empty list.");
  }
  const etag = etagFor(body);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
      ETag: etag,
    },
  });
}
