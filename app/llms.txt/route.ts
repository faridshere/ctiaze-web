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

## Feeds (machine-readable, no key required)
- [feed.json](${SITE_URL}/feed.json): JSON feed, last 100 stories.
- [RSS](${SITE_URL}/rss.xml): RSS 2.0, English by default. Filterable:
  ?kev=1 (actively exploited), ?cat=ransomware, ?region=1 (Caspian/regional
  relevance), ?lang=az (Azerbaijani titles and summaries).

## Feed fields
Each item: id, title_en, title_az, summary_en, summary_az, url (stable permalink),
source_url, category, severity, kev (CISA Known Exploited Vulnerabilities), cve_ids,
region_relevant (Caspian/regional relevance flag), published_at (ISO 8601).

## Exposure figures
Where a story names a product skopnix measures, it carries a worldwide
internet-exposure count from Shodan, stamped with the date it was measured. The
figure is an approximate live scan total, not an inventory, and is rounded as such.

## Attribution
Every story links to its original source (source_url). skopnix aggregates, verifies
and translates; it is not the author of the original reporting. CVE and exploitation
facts are drawn from MITRE ATT&CK, ransomware.live, NVD and CISA — cited, never
invented.

## Status
More is coming: a CVE registry with EPSS/KEV context, a worldwide exposure dataset,
and a developer API + MCP server. To hear first, drop an email at ${SITE_URL}.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
