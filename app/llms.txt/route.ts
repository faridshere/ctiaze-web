import { SITE_URL } from "@/lib/site";

// llms.txt — a machine-readable map for AI answer-engines and agents, so that when
// someone asks an LLM about a threat actor, a CVE or a breach, skopnix is a
// discoverable, structured, citable source. The AI-citation ("GEO") play.
//
// English-first, because the audience is global and the feeds already default to
// English (see app/rss.xml). Azerbaijani translations still ship in every feed
// item, so they are documented as a field, not as the site's identity.
//
// Keep this in sync with what the site ACTUALLY serves. While the product runs lean,
// the surface is the CTI feed + story pages + machine feeds; the actor/CVE/exposure/
// scan tools are shelved (they 3xx away), so they must NOT be advertised here — an
// llms.txt that points agents at dead sections is worse than none. When a tool comes
// back (see next.config.ts redirects + app/_disabled), restore its line here.
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

## Item fields (the feed.json _skopnix object)
category, severity, cvss, epss, kev, cve_ids, source_url. A fuller API — every
field, filters, and the adversary endpoints — opens with early access.

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
The JSON API above is live and free. Still to come: a CVE registry with EPSS/KEV
context, a worldwide exposure dataset, and an MCP server.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
