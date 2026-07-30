import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/stories";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Command-palette search index. Rate-limited + CDN-cached: the index changes at
// most every couple hours, so serving it from the edge shields the read-only
// Mongo replica from a ~200-doc query on every keystroke-driven fetch.
export async function GET(req: Request) {
  if (!rateLimit(`search:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const index = await getSearchIndex();
  return NextResponse.json(index, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
  });
}
