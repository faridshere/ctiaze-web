import { NextResponse } from "next/server";
import { getFeed } from "@/lib/stories";
import { SITE_URL } from "@/lib/site";

// Public JSON Feed (jsonfeed.org 1.1) — the machine-readable substrate for feed
// readers, AI answer engines and agents. English + global. CDN-cached 5 min.
export async function GET() {
  const items = await getFeed(100);
  return NextResponse.json(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: "skopnix — cyber-threat intelligence",
      home_page_url: SITE_URL,
      feed_url: `${SITE_URL}/feed.json`,
      description:
        "Global cyber-threat intelligence, off the wire — grounded, refreshed around the clock, nothing invented.",
      language: "en",
      items: items.filter((it) => it.title_en).map((it) => ({
        id: it.url,
        url: it.url,
        title: it.title_en,
        content_text: it.summary_en,
        date_published: it.published_at,
        tags: [it.category, ...(it.kev ? ["actively-exploited"] : []), ...it.cve_ids].filter(Boolean),
        // JSON Feed extension: the extra CTI fields, namespaced with a leading _.
        _skopnix: {
          category: it.category,
          severity: it.severity,
          kev: it.kev,
          cve_ids: it.cve_ids,
          source_url: it.source_url,
        },
      })),
    },
    {
      headers: {
        "Content-Type": "application/feed+json; charset=utf-8",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
