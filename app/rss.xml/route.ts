import { getStories } from "@/lib/stories";

const SITE = "https://ctiaze.tech";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// RSS 2.0, with optional filters so a reader can subscribe to exactly the slice
// they care about — "only Azerbaijan-relevant threats" or "only actively-exploited
// (KEV)" is a subscription nobody else in the region offers, and it IS the product's
// differentiator in feed form:
//   ?kev=1         only actively-exploited (KEV) stories
//   ?region=1      only Azerbaijan / regional stories
//   ?cat=ransomware   only that category
//   ?lang=en       English titles/summaries (default Azerbaijani)
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const en = q.get("lang") === "en";
  const onlyKev = q.get("kev") === "1";
  const onlyRegion = q.get("region") === "1";
  const cat = (q.get("cat") || "").trim().toLowerCase();

  let stories = await getStories(80);
  if (onlyKev) stories = stories.filter((s) => s.kev);
  if (onlyRegion) stories = stories.filter((s) => s.region);
  if (cat) stories = stories.filter((s) => s.category.toLowerCase() === cat);
  stories = stories.slice(0, 50);

  const suffix = [onlyKev && "KEV", onlyRegion && "AZ", cat].filter(Boolean).join(" · ");
  const selfQs = q.toString();
  const self = `${SITE}/rss.xml${selfQs ? `?${selfQs}` : ""}`;

  const items = stories
    .map((s) => {
      const link = `${SITE}/xeber/${s.slug}`;
      // Fall back to AZ when an English field is missing (e.g. digest items) so a
      // single title-less doc can't 500 the whole feed via esc(undefined).
      const title = (en ? s.titleEn || s.titleAz : s.titleAz || s.titleEn) || "";
      const body = ((en ? s.summaryEn || s.bodyAz : s.bodyAz) || "").slice(0, 500);
      const cats = [s.category, ...(s.kev ? ["kev"] : []), ...(s.region ? ["azerbaijan"] : []), ...s.cveIds]
        .map((c) => `<category>${esc(c)}</category>`)
        .join("");
      return `    <item>
      <title>${esc(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(s.publishedAt).toUTCString()}</pubDate>
      ${cats}
      <description>${esc(body)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`ctiaze — ${en ? "Azerbaijan CTI" : "Azərbaycan CTI"}${suffix ? ` (${suffix})` : ""}`)}</title>
    <link>${SITE}</link>
    <atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
    <description>${esc(en ? "Automated Azerbaijani cybersecurity threat intelligence." : "Azərbaycan dilində avtomatlaşdırılmış kibertəhlükəsizlik threat intelligence.")}</description>
    <language>${en ? "en" : "az"}</language>
    <lastBuildDate>${(stories[0] ? new Date(stories[0].publishedAt) : new Date()).toUTCString()}</lastBuildDate>
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
