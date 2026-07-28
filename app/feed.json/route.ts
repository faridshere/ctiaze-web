import { NextResponse } from "next/server";
import { getFeed } from "@/lib/stories";

// Public machine-readable feed — the substrate the ctiaze.dev developer portal
// and any AI agent / MCP server consumes. CDN-cached for 5 min (feed changes at
// most every couple hours, so a live DB hit per request is wasteful).
export async function GET() {
  const items = await getFeed(100);
  return NextResponse.json(
    {
      source: "ctiaze.tech",
      description:
        "Azərbaycan dilində avtomatlaşdırılmış CTI feed. Son 100 dərc olunmuş xəbər.",
      generated_at: new Date().toISOString(),
      count: items.length,
      items,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
