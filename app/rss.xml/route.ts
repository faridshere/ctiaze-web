import { queryStories } from "@/lib/stories";
import { completeSentences } from "@/lib/format";
import { SITE_URL, storyUrl } from "@/lib/site";

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
//   ?lang=az       Azerbaijani titles/summaries (English is the default)
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const en = q.get("lang") !== "az"; // English/global by default
  const onlyKev = q.get("kev") === "1";
  const onlyRegion = q.get("region") === "1";
  const cat = (q.get("cat") || "").trim().toLowerCase();
  // ?q=term1,term2 — a personal "my stack" feed (FortiGate, VMware…). Each term must be
  // a case-insensitive substring of a story's title (AZ+EN) or its tag-like fields
  // (category, CVE ids — the same values emitted as <category> below). Deduped and
  // double-capped (total input length + term count) so a crafted URL can't turn the
  // feed into an expensive scan. AND-composed with the filters above; absent/empty q
  // leaves behaviour unchanged.
  const terms = [
    ...new Set(
      (q.get("q") || "")
        .slice(0, 200)
        .toLowerCase()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, 10);

  // kev / region / cat run in Mongo over the whole archive (2026-10-10): this
  // used to filter the newest 80 stories, so ?kev=1 returned 2 items. The free-
  // text ?q= terms still match in memory, over a wider window of the already-
  // filtered set (up to 300), since substring search has no index to use.
  const { stories: matched } = await queryStories(
    { kev: onlyKev, region: onlyRegion, category: cat || undefined },
    terms.length ? 300 : 80,
  );
  let stories = matched;
  if (terms.length) {
    stories = stories.filter((s) => {
      const hay = `${s.titleAz} ${s.titleEn} ${s.category} ${s.cveIds.join(" ")}`.toLowerCase();
      return terms.some((t) => hay.includes(t));
    });
  }
  stories = stories.filter((s) => s.titleEn).slice(0, 50); // English-only feed

  const suffix = [onlyKev && "KEV", onlyRegion && "AZ", cat, terms.length && terms.join(", ")]
    .filter(Boolean)
    .join(" · ");
  const selfQs = q.toString();
  const self = `${SITE_URL}/rss.xml${selfQs ? `?${selfQs}` : ""}`;

  const items = stories
    .map((s) => {
      const link = storyUrl(s.slug);
      // Fall back to AZ when an English field is missing (e.g. digest items) so a
      // single title-less doc can't 500 the whole feed via esc(undefined).
      const title = (en ? s.titleEn || s.titleAz : s.titleAz || s.titleEn) || ""; // en path uses titleEn (filtered above)
      const body = completeSentences(((en ? s.summaryEn : s.bodyAz) || "").slice(0, 500));
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
    <title>${esc(`skopnix — cyber-threat intelligence${suffix ? ` · ${suffix}` : ""}`)}</title>
    <link>${SITE_URL}</link>
    <atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
    <description>${esc(en ? "Global cyber-threat intelligence, off the wire — actively-exploited CVEs, threat actors and live IOCs." : "Qlobal kibertəhlükə kəşfiyyatı.")}</description>
    <language>${en ? "en" : "az"}</language>
    <lastBuildDate>${(stories[0] ? new Date(stories[0].publishedAt) : new Date()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
