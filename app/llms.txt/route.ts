// llms.txt — a machine-readable map for AI answer-engines and agents, so that when
// someone asks an LLM about Azerbaijani cyber threats, skopnix is a discoverable,
// structured, citable source. Bilingual on purpose: answer-engine queries about
// "Azerbaijan cyber threats" are overwhelmingly English, but the unique content is
// Azerbaijani — so both audiences get an accurate map. The AI-citation ("GEO") play.
//
// Keep this in sync with what the site ACTUALLY serves. While the product runs lean,
// the surface is the CTI feed + story pages + machine feeds; the actor/CVE/exposure/
// scan tools are shelved (they 3xx away), so they must NOT be advertised here — an
// llms.txt that points agents at dead sections is worse than none. When a tool comes
// back (see next.config.ts redirects + app/_disabled), restore its line here.
export async function GET() {
  const body = `# skopnix

> Automated cyber-threat-intelligence (CTI). News from international sources (NVD,
> CISA KEV, ransomware.live, MITRE ATT&CK, security blogs) is AI-filtered for
> relevance, grounded against the source (anti-hallucination), and published as a
> bilingual English/Azerbaijani feed — 24/7, no human in the loop.
> (AZ) Beynəlxalq mənbələrdən avtomatlaşdırılmış, mənbəyə əsaslanan kibertəhlükəsizlik
> threat intelligence — ingilis və Azərbaycan dillərində.

## Key pages
- [News feed](https://skopnix.com/news): the bilingual, source-grounded CTI feed;
  individual stories at /news/{slug}. Each story cites its original source and, where
  relevant, the CVEs and CISA KEV status involved.
- [Home](https://skopnix.com): the landing page and latest wire.

## Feeds (machine-readable, no key required)
- [feed.json](https://skopnix.com/feed.json): JSON feed, last 100 stories.
- [RSS](https://skopnix.com/rss.xml): RSS 2.0. Filterable: ?kev=1 (actively exploited),
  ?region=1 (Azerbaijan/regional), ?cat=ransomware, ?lang=en (English).

## Feed fields
Each item: id, title_az, title_en, summary_az, summary_en, url (stable permalink),
source_url, category, severity, kev (CISA Known Exploited Vulnerabilities), cve_ids,
region_relevant (Azerbaijan/regional relevance), published_at (ISO 8601).

## Attribution
Every story links to its original source (source_url). skopnix aggregates, verifies
and translates; it is not the author of the original reporting. CVE and exploitation
facts are drawn from MITRE ATT&CK, ransomware.live, NVD and CISA — cited, never
invented.

## Status
More is coming: threat-actor dossiers, a CVE registry with EPSS/KEV context, an
Azerbaijan internet-exposure dataset, and a developer API + MCP server. To hear
first, drop an email at https://skopnix.com.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
