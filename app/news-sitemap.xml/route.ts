import { getStories } from "@/lib/stories";

const SITE = "https://ctiaze.tech";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Google News sitemap (the <news:news> extension). Distinct from sitemap.xml on
// purpose: News sitemaps must ONLY list articles from the last 48 hours — Google
// ignores older entries and may distrust the file if it's padded. This is the
// $0 path into the Google News surface, where an Azerbaijani-language security
// publisher has effectively no competition. Referenced from robots.ts; submit
// once in Search Console for fastest pickup.
export const revalidate = 900; // fresh enough for a 2h publish cadence

export async function GET() {
  const stories = await getStories(80).catch(() => []);
  const cutoff = Date.now() - 48 * 3600_000;
  const fresh = stories.filter((s) => new Date(s.publishedAt).getTime() >= cutoff);

  const urls = fresh
    .map((s) => {
      const title = s.titleAz || s.titleEn;
      return `  <url>
    <loc>${SITE}/news/${esc(s.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>skopnix</news:name>
        <news:language>az</news:language>
      </news:publication>
      <news:publication_date>${new Date(s.publishedAt).toISOString()}</news:publication_date>
      <news:title>${esc(title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}
