// llms.txt — a machine-readable map for AI answer-engines and agents, so that
// when someone asks an LLM about Azerbaijani cyber threats, ctiaze is a
// discoverable, structured, citable source. This is the AI-citation ("GEO")
// play from the platform roadmap.
export async function GET() {
  const body = `# ctiaze

> Azərbaycan dilində avtomatlaşdırılmış kibertəhlükəsizlik threat intelligence (CTI). Beynəlxalq mənbələrdən (NVD, CISA KEV, ransomware.live, təhlükəsizlik bloqları) toplanan xəbərlər AI ilə relevance üzrə süzülür, mənbəyə qarşı qruntlanır (anti-hallucination) və Azərbaycan dilinə tərcümə edilir.

## Feeds
- [feed.json](https://ctiaze.tech/feed.json): Machine-readable JSON feed — son 100 dərc olunmuş xəbər.
- [RSS](https://ctiaze.tech/rss.xml): RSS 2.0 feed.

## Sites
- [ctiaze.tech](https://ctiaze.tech): Human-readable Azərbaycan-dilli CTI konsolu.
- [ctiaze.dev](https://ctiaze.dev): Developer / API / MCP portalı.

## Feed fields
Hər item: id, title_az, title_en, url (stabil permalink), source_url, category, severity, kev (CISA Known Exploited Vulnerabilities), cve_ids, region_relevant (Azərbaycan/regional əlaqə), published_at (ISO 8601).

## Attribution
Hər xəbər öz orijinal mənbəyinə (source_url) keçid saxlayır. ctiaze aqreqasiya və tərcümə edir; orijinal hesabatların müəllifi deyil.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
