// llms.txt — a machine-readable map for AI answer-engines and agents, so that when
// someone asks an LLM about Azerbaijani cyber threats, skopnix is a discoverable,
// structured, citable source. Bilingual on purpose: answer-engine queries about
// "Azerbaijan cyber threats" are overwhelmingly English, but the unique content is
// Azerbaijani — so both audiences get an accurate map. The AI-citation ("GEO") play.
export async function GET() {
  const body = `# skopnix

> Automated Azerbaijani cyber-threat-intelligence (CTI). News from international
> sources (NVD, CISA KEV, ransomware.live, MITRE ATT&CK, security blogs) is
> AI-filtered for relevance, grounded against the source (anti-hallucination), and
> translated into Azerbaijani — 24/7, no human in the loop.
> (AZ) Azərbaycan dilində avtomatlaşdırılmış kibertəhlükəsizlik threat intelligence.

## Key pages
- [Threat actors](https://skopnix.com/actors): the only Azerbaijani threat-actor
  dossier set — hundreds of APT/crime groups with MITRE ATT&CK techniques, malware,
  victimology and regional targeting. Per-actor pages at /actors/{slug}.
- [CVE registry](https://skopnix.com/cve): CVEs with CISA KEV + FIRST EPSS context.
- [Exposure](https://skopnix.com/exposure): a weekly Shodan dataset of Azerbaijan's
  internet-exposed attack surface (a recurring, unique dataset).
- [Scan-me](https://skopnix.com/scan-me): keyless email-breach + infostealer + domain
  attack-surface lookup.
- [News](https://skopnix.com): the bilingual, grounded CTI feed; stories at /news/{slug}.

## Feeds
- [feed.json](https://skopnix.com/feed.json): JSON feed, last 100 stories.
- [RSS](https://skopnix.com/rss.xml): RSS 2.0. Filterable: ?kev=1 (actively exploited),
  ?region=1 (Azerbaijan/regional), ?cat=ransomware, ?lang=en (English).

## Feed fields
Each item: id, title_az, title_en, summary_az, summary_en, url (stable permalink),
source_url, category, severity, kev (CISA Known Exploited Vulnerabilities), cve_ids,
region_relevant (Azerbaijan/regional relevance), published_at (ISO 8601).

## Sites
- [skopnix.com](https://skopnix.com): the human-readable bilingual CTI console.
- [skopnix.com/developers](https://skopnix.com/developers): developer / API portal.

## Attribution
Every story links to its original source (source_url). skopnix aggregates, verifies
and translates; it is not the author of the original reporting. Actor/CVE facts are
drawn from MISP Galaxy, MITRE ATT&CK, ransomware.live, NVD and CISA — cited, never
invented.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
