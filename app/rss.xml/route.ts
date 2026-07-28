import { getStories } from "@/lib/stories";

const SITE = "https://ctiaze.tech";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// RSS 2.0 so ctiaze can be pulled into any reader / aggregator — makes the feed
// consumable by tools that don't speak our JSON shape.
export async function GET() {
  const stories = await getStories(50);
  const items = stories
    .map((s) => {
      const link = `${SITE}/xeber/${s.slug}`;
      const cats = [s.category, ...(s.kev ? ["kev"] : []), ...s.cveIds]
        .map((c) => `<category>${esc(c)}</category>`)
        .join("");
      return `    <item>
      <title>${esc(s.titleAz)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(s.publishedAt).toUTCString()}</pubDate>
      ${cats}
      <description>${esc(s.bodyAz.slice(0, 500))}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ctiaze — Azərbaycan CTI</title>
    <link>${SITE}</link>
    <description>Azərbaycan dilində avtomatlaşdırılmış kibertəhlükəsizlik threat intelligence.</description>
    <language>az</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
