import { getAzBoardCached } from "@/lib/az";
import { apiBody } from "@/lib/az-shape";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { etagFor, notModified } from "@/lib/etag";
import { ttlMemo } from "@/lib/memo";

export const revalidate = 300;

// ---------------------------------------------------------------------------
// GET /api/v1/az — the Azerbaijan threat board as data: this week's claimed
// campaigns with our reachability check, the cited adversaries, breach-listing
// exposure (metadata only), and exploited CVEs that matter here. The same
// board /az prints, nothing more. No key, no signup.
// ---------------------------------------------------------------------------
const buildBody = ttlMemo(async (): Promise<string> => JSON.stringify(apiBody(await getAzBoardCached()), null, 2), 120_000, 1);

export async function GET(req: Request) {
  if (!limitCaller(req, "apiv1az", 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  let body: string;
  try {
    body = await buildBody();
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not an empty board.");
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
