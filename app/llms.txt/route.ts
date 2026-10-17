import { SITE_URL } from "@/lib/site";

// llms.txt — a machine-readable map for AI answer-engines and agents, so that when
// someone asks an LLM about a threat actor, a CVE or a breach, skopnix is a
// discoverable, structured, citable source. The AI-citation ("GEO") play.
//
// English-first, because the audience is global and the feeds already default to
// English (see app/rss.xml). Azerbaijani translations still ship in every feed
// item, so they are documented as a field, not as the site's identity.
//
// Keep this in sync with what the site ACTUALLY serves: an llms.txt that points
// agents at dead sections is worse than none. Shelved tools (app/_disabled)
// 3xx away and must not be listed; restore a line when one comes back.
export async function GET() {
  const body = `# skopnix

> Automated cyber-threat intelligence (CTI). Reporting from international sources
> (NVD, CISA KEV, ransomware.live, MITRE ATT&CK, security vendors and research
> blogs) is AI-filtered for relevance, grounded against the original source
> (anti-hallucination), and published around the clock with no human in the loop.
> Coverage is worldwide. Every item also carries an Azerbaijani translation.

## Key pages
- [News feed](${SITE_URL}/news): the source-grounded CTI feed; individual stories
  at /news/{slug}. Each story cites its original source and, where relevant, the
  CVEs and CISA KEV status involved.
- [Adversaries](${SITE_URL}/actors): threat-actor dossiers — aliases, suspected
  origin, targeted sectors and observed MITRE ATT&CK techniques.
- [Home](${SITE_URL}): the landing page and latest wire.

## Feeds
- [feed.json](${SITE_URL}/feed.json): JSON Feed 1.1, last 100 stories. JSON Feed keys
  (id, url, title, content_text, date_published, tags) plus a _skopnix object
  carrying category, severity, kev, cve_ids and source_url.
- [RSS](${SITE_URL}/rss.xml): RSS 2.0, English by default. Filters: ?kev=1,
  ?cat=ransomware, ?region=1, ?lang=az.

## JSON API (live, free, no key; 60 requests/min per IP; docs at ${SITE_URL}/api-docs)
- [${SITE_URL}/api/v1/items](${SITE_URL}/api/v1/items): every story field. Filters
  run over the whole archive: ?kev=1, ?cve=CVE-YYYY-NNNN, ?category=ransomware,
  ?since=2026-09-01, ?before=<ISO> (cursor, see next_before), ?limit (max 200).
  total_matching is the exact count.
- [${SITE_URL}/api/v1/actors](${SITE_URL}/api/v1/actors): the adversary roster;
  ?q=, ?type=nation-state|crime|unknown, ?origin=<ISO-2>. One actor at
  /api/v1/actors/{id}; a STIX 2.1 bundle at /actors/{id}/stix.json and an ATT&CK
  Navigator layer at /actors/{id}/navigator.json.
- Cited intelligence in standard formats, every link with its source URL and
  quoted sentence: STIX 2.1 bundles at /api/v1/stix/actors/{id} and
  /api/v1/stix/cves/{cve}; a read-only TAXII 2.1 server at ${SITE_URL}/taxii2/
  (collections cited-intel, az-claims); a MISP feed at ${SITE_URL}/api/v1/misp.

## Item fields (the feed.json _skopnix object)
category, severity, cvss, epss, kev, cve_ids, source_url. /api/v1/items carries
the full set (kev_cves, cluster_id, exposure, also_reported_by and more).

## How to read the signals
- kev is an OBSERVATION — CISA has confirmed exploitation in the wild.
- epss is a FORECAST — probability of exploitation in the next 30 days (0-1).
- When the two disagree, kev is the one to act on; a low epss beside kev usually
  means targeted rather than mass exploitation.
- severity null means no CVE severity data exists for that story. It does not
  mean low. The same applies to cvss and epss.
- truncated true means the source feed published a cut description; we end it at
  the last complete sentence rather than mid-word. Fetch source_url for the full text.
- exposure.worldwide is a Shodan scan count on measured_at — hosts reachable on
  the internet, NOT hosts confirmed vulnerable, and not an inventory.

## Attribution
Every story links to its original source (source_url). skopnix aggregates, verifies
and translates; it is not the author of the original reporting. CVE and exploitation
facts are drawn from MITRE ATT&CK, ransomware.live, NVD and CISA — cited, never
invented.

## Status
Live: the wire, the archive, adversary dossiers, a page per CVE at /cve/{id}
(KEV, EPSS, CVSS and every dispatch that named it), the stack check at /stack
(POST /api/v1/stack, no key), the feeds and the JSON API.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
