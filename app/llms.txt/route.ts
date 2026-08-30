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
- [Threat actors](https://ctiaze.tech/actors): the only Azerbaijani threat-actor
  dossier set — hundreds of APT/crime groups with MITRE ATT&CK techniques, malware,
  victimology and regional targeting. Per-actor pages at /actors/{slug}.
- [CVE registry](https://ctiaze.tech/cve): CVEs with CISA KEV + FIRST EPSS context.
- [Exposure](https://ctiaze.tech/exposure): a weekly Shodan dataset of Azerbaijan's
  internet-exposed attack surface (a recurring, unique dataset).
- [Scan-me](https://ctiaze.tech/scan-me): keyless email-breach + infostealer + domain
  attack-surface lookup.
- [News](https://ctiaze.tech): the bilingual, grounded CTI feed; stories at /news/{slug}.

## Feeds
- [feed.json](https://ctiaze.tech/feed.json): JSON feed, last 100 stories.
- [RSS](https://ctiaze.tech/rss.xml): RSS 2.0. Filterable: ?kev=1 (actively exploited),
  ?region=1 (Azerbaijan/regional), ?cat=ransomware, ?lang=en (English).

## Feed fields
Each item: id, title_az, title_en, summary_az, summary_en, url (stable permalink),
source_url, category, severity, kev (CISA Known Exploited Vulnerabilities), cve_ids,
region_relevant (Azerbaijan/regional relevance), published_at (ISO 8601).

## Sites
- [ctiaze.tech](https://ctiaze.tech): the human-readable bilingual CTI console.
- [ctiaze.dev](https://ctiaze.dev): developer / API portal.

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
