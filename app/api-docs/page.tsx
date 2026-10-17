import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { CtaBand } from "@/components/site/CtaBand";
import { absoluteUrl, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const INTRO =
  "The wire as data. No key, no account, no rate-limit negotiation — 60 requests a minute per IP, JSON, CORS open.";

export const metadata: Metadata = {
  title: "API",
  description: INTRO,
  alternates: { canonical: absoluteUrl("/api-docs") },
  // Indexed and linked from the header and footer since 2026-10-10: the API
  // was always live and keyless, and hiding its docs "until early access"
  // only hid the product.
};

// Every route that exists under app/ today and answers a GET, nothing else.
// Rate limits are the real values in each route file (limitCaller).
const ENDPOINTS: { path: string; gives: string; limit: string; params: string }[] = [
  { path: "/feed.json", gives: "JSON Feed 1.1 of the newest dispatches", limit: "cached, hourly", params: "none" },
  { path: "/rss.xml", gives: "RSS 2.0, English by default", limit: "cached, hourly", params: "kev, region, cat, lang, q" },
  { path: "/api/v1/items", gives: "dispatches as data, newest first, filterable over the whole archive", limit: "60/min", params: "kev, cve, category, since, before, limit" },
  { path: "/api/v1/actors", gives: "the adversary roster, one lean row per dossier", limit: "60/min", params: "q, type, origin, limit" },
  { path: "/api/v1/actors/{id}", gives: "one dossier as data", limit: "120/min", params: "none" },
  { path: "/api/v1/cves/{id}/actors", gives: "actors a source is cited as tying to a CVE, each with its quote and source url", limit: "60/min", params: "none" },
  { path: "/actors/{id}/stix.json", gives: "the dossier as a STIX 2.1 bundle", limit: "60/min", params: "none" },
  { path: "/actors/{id}/navigator.json", gives: "the dossier as an ATT&CK Navigator layer", limit: "60/min", params: "none" },
  { path: "/api/v1/stix/actors/{id}", gives: "an actor's cited intelligence as a STIX 2.1 bundle: every CVE, technique and indicator link quoted and sourced", limit: "60/min", params: "page" },
  { path: "/api/v1/stix/cves/{cve}", gives: "every actor a published report ties to one CVE, as a STIX 2.1 bundle", limit: "60/min", params: "page" },
  { path: "/taxii2/", gives: "TAXII 2.1 discovery: the read-only API root and its collections, cited-intel and az-claims", limit: "60/min", params: "none" },
  { path: "/api/v1/taxii2/collections/{id}/objects/", gives: "one page of a TAXII collection as an envelope of STIX 2.1 objects", limit: "60/min", params: "added_after, limit, next" },
  { path: "/api/v1/misp/manifest.json", gives: "a MISP feed: one event per actor with its cited indicators and CVEs", limit: "60/min", params: "none" },
  { path: "/llms.txt", gives: "a map of the site for AI agents", limit: "cached", params: "none" },
];

const PARAMS: { route: string; items: { name: string; note: string }[] }[] = [
  {
    route: "/api/v1/items",
    items: [
      { name: "kev=1", note: "Only items on CISA's Known Exploited Vulnerabilities catalogue." },
      { name: "cve=CVE-YYYY-NNNN", note: "Every dispatch that names that CVE." },
      { name: "category=…", note: "One of exploit, vuln, apt, malware, ransomware, breach, supply-chain, research, policy. Anything else is a 400." },
      { name: "since=…", note: "ISO 8601 date or datetime. A malformed one is a 400, not a silent empty list." },
      { name: "before=…", note: "Everything strictly older than this instant. Each response carries next_before; feed it back to keep walking." },
      { name: "limit=…", note: "1 to 200, default 50." },
    ],
  },
  {
    route: "/api/v1/actors",
    items: [
      { name: "q=…", note: "Case-insensitive substring over name and aliases." },
      { name: "type=…", note: "nation-state, crime or unknown. Anything else is a 400." },
      { name: "origin=…", note: "ISO-2 country code, as the source states it." },
      { name: "limit=…", note: "1 to 500, default 100." },
    ],
  },
  {
    route: "/api/v1/stix/actors/{id} · /api/v1/stix/cves/{cve}",
    items: [
      { name: "page=…", note: "1 and up, default 1. A page holds up to 400 citations, so never more than 803 objects. X-Total-Pages gives the count and a Link: rel=\"next\" header names the next page. Past the last page is a 404." },
    ],
  },
  {
    route: "/api/v1/taxii2/collections/{id}/objects/",
    items: [
      { name: "{id}", note: "The collection's UUID from /api/v1/taxii2/collections/, or its title: cited-intel or az-claims." },
      { name: "added_after=…", note: "RFC 3339 UTC timestamp. Only objects added strictly after it. Anything else is a 400." },
      { name: "limit=…", note: "Objects per page, 3 to 1000, default 1000. A citation's objects are never split across pages, so a page can hold fewer." },
      { name: "next=…", note: "The opaque value the previous page returned while more was true. Use it rather than added_after to walk a collection: many rows can share one second, and next never skips them." },
    ],
  },
  {
    route: "/rss.xml",
    items: [
      { name: "kev=1", note: "Only actively-exploited (KEV) stories." },
      { name: "region=1", note: "Only regional stories." },
      { name: "cat=…", note: "One category." },
      { name: "lang=az", note: "Azerbaijani titles and summaries; English is the default." },
      { name: "q=a,b", note: "Up to ten comma-separated terms matched against titles, category and CVE ids: a feed for your own stack." },
    ],
  },
];

const EXAMPLES: { label: string; cmd: string; note: string }[] = [
  {
    label: "Everything actively exploited",
    cmd: `curl "${SITE_URL}/api/v1/items?kev=1"`,
    note: "Only items on CISA's Known Exploited Vulnerabilities catalogue — confirmed exploited, not predicted.",
  },
  {
    label: "One CVE",
    cmd: `curl "${SITE_URL}/api/v1/items?cve=CVE-2026-81578"`,
    note: "Every dispatch that names that CVE.",
  },
  {
    label: "Since a date, ransomware only",
    cmd: `curl "${SITE_URL}/api/v1/items?category=ransomware&since=2026-09-01&limit=100"`,
    note: "since takes an ISO 8601 date. A malformed one is a 400, not a silent empty list.",
  },
  {
    label: "Page backwards through the archive",
    cmd: `curl "${SITE_URL}/api/v1/items?before=2026-08-15T00:00:00Z&limit=100"`,
    note: "Everything strictly older than `before`. Each response carries next_before — feed it back to keep walking.",
  },
  {
    label: "The adversary roster",
    cmd: `curl "${SITE_URL}/api/v1/actors?q=blizzard&type=nation-state"`,
    note: "Every dossier as a lean row: id, aliases, origin, and how often our own wire named it in 90 days.",
  },
  {
    label: "One dossier, as data",
    cmd: `curl "${SITE_URL}/api/v1/actors/turla"`,
    note: "Techniques, tools, targets, the dispatches that named it, and — once the engine has computed them — the CVEs it uses and recent reports. Alias ids 308 to the canonical actor.",
  },
  {
    label: "A dossier as an ATT&CK Navigator layer",
    cmd: `curl "${SITE_URL}/actors/apt28/navigator.json"`,
    note: "Layer format 4.5, Enterprise — open it at mitre-attack.github.io/attack-navigator and diff it against your own coverage. 404 when we hold no techniques for the group: an empty layer loads cleanly and reads as a group that does nothing.",
  },
  {
    label: "A dossier as a STIX 2.1 bundle",
    cmd: `curl "${SITE_URL}/actors/apt28/stix.json"`,
    note: "intrusion-set, one attack-pattern per technique, malware, tools, and the uses relationships between them — the shape a TIP ingests without anyone writing a parser for us. Alias ids 308 to the canonical actor.",
  },
  {
    label: "An actor's cited intelligence, as STIX 2.1",
    cmd: `curl "${SITE_URL}/api/v1/stix/actors/apt28"`,
    note: "The CVEs it exploits, the techniques it uses and the indicators that indicate it, each a relationship carrying the source URL and the sentence it rests on. Same intrusion-set and attack-pattern ids as stix.json above, so the two merge in your TIP.",
  },
  {
    label: "Who exploits this CVE",
    cmd: `curl "${SITE_URL}/api/v1/stix/cves/CVE-2023-23397"`,
    note: "One vulnerability, every actor we hold a dossier for that a published report ties to it, and one exploits relationship per report.",
  },
  {
    label: "TAXII 2.1, from the top",
    cmd: `curl -L -H "Accept: application/taxii+json;version=2.1" "${SITE_URL}/taxii2/"`,
    note: "Discovery names the API root; the root lists the collections. Point OpenCTI's TAXII2 connector, or any TAXII 2.1 client, at this URL.",
  },
  {
    label: "Poll a collection for what is new",
    cmd: `curl -L -H "Accept: application/taxii+json;version=2.1" "${SITE_URL}/api/v1/taxii2/collections/cited-intel/objects/?added_after=2026-10-01T00:00:00Z&limit=500"`,
    note: "An envelope: objects, more, and next while more is true. X-TAXII-Date-Added-Last is the added_after for your next poll.",
  },
  {
    label: "MISP feed",
    cmd: `${SITE_URL}/api/v1/misp`,
    note: "In MISP: Sync Actions → Feeds → Add Feed, source format MISP Feed, this URL. MISP reads manifest.json and fetches each actor's event as it changes; every attribute's comment is the quoted sentence and its source.",
  },
];

const FIELDS: { name: string; type: string; note: string }[] = [
  { name: "id", type: "string", note: "Stable pipeline id. Prefixed cve: / url: / digest: / spike:." },
  { name: "url", type: "string", note: "Permalink on skopnix.com." },
  { name: "source_url", type: "string", note: "The original report. We aggregate and verify; we do not author it." },
  { name: "title_en / title_az", type: "string", note: "English and Azerbaijani headline." },
  { name: "summary_en / summary_az", type: "string", note: "Body text, trimmed to whole sentences." },
  { name: "truncated", type: "boolean", note: "true when the source feed published a cut description and we ended it at the last complete sentence. Fetch source_url for the whole thing." },
  { name: "category", type: "string", note: "One of: exploit, vuln, apt, malware, ransomware, breach, supply-chain, research, policy. Assigned by the relevance model; treat as a hint, not a taxonomy." },
  { name: "severity", type: "string | null", note: "critical / high / medium / low. null means no CVE severity data — not 'low'." },
  { name: "cvss", type: "number | null", note: "As stated by the cited source. null when none was published." },
  { name: "epss", type: "number | null", note: "0-1 probability of exploitation in the next 30 days. A FORECAST." },
  { name: "kev", type: "boolean", note: "On CISA KEV. An OBSERVATION of exploitation, and it outranks epss whenever the two disagree." },
  { name: "cve_ids", type: "string[]", note: "CVEs named in the source. Empty is common — most reporting carries none." },
  { name: "cves", type: "{id, kev}[]", note: "The same CVEs with a per-CVE KEV flag from the catalogue we hold. Use this, not the item-level kev, to decide which CVE is exploited." },
  { name: "kev_cves", type: "string[]", note: "Exactly which of cve_ids are on KEV. A roundup of 400 CVEs is kev:true because of the one or two listed here." },
  { name: "roundup", type: "boolean", note: "true when the item names 20+ CVEs (Patch Tuesday lists). Treat its signals as a digest, not a verdict on any single CVE." },
  { name: "region_relevant", type: "boolean", note: "Flagged as Caspian/regional relevance." },
  { name: "published_at", type: "string", note: "ISO 8601, UTC. When the SOURCE published it, falling back to dispatched_at when the source carried no date. Sorting, since and before all use this field." },
  { name: "dispatched_at", type: "string", note: "ISO 8601, UTC. When skopnix put it on the wire. Always at or after published_at; the gap is our detection latency." },
  { name: "exposure", type: "object | null", note: "{product, worldwide, measured_at} — a Shodan scan count, not an inventory, dated to the day it was measured." },
  { name: "also_reported_by", type: "string[]", note: "Other outlets that ran the same story." },
  { name: "cluster_id", type: "string | null", note: "Stories about the same event within 72h share one id. null when the item stands alone." },
  { name: "is_duplicate", type: "boolean", note: "true on the later members of a cluster; the first-seen member is false. Filter on false to see one item per event." },
];

// A section front on the reference page: 2px rule, label head in the left
// margin column, content on the right. The same shape three times.
function Ref({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section className="mt-[var(--sp-section)]" aria-labelledby={id}>
      <div className="rule-2" />
      <div className="grid gap-5 pt-5 md:grid-cols-[11rem_1fr] md:gap-6">
        <h2 id={id} className="label text-ink">
          {label}
        </h2>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <>
      <SiteHeader section="Reference · Machine feeds" />
      <main id="main">
        <PageHead narrow kicker="Developers" title="API">
          <p className="prose-paper mt-6">{INTRO}</p>
        </PageHead>

        <div className="sheet">
          {/* The endpoints as a ruled table: every route that answers today. */}
          <section className="mt-10 sm:mt-12" aria-labelledby="api-endpoints">
            <h2 id="api-endpoints" className="label text-ink">
              Endpoints
            </h2>
            {/* Under md the same list stacks: route, returns, then one mono
                meta line (limit · parameters). From md up, the four-column table. */}
            <ol className="mt-3 border-t border-ink md:hidden">
              {ENDPOINTS.map((e) => (
                <li key={e.path} className="border-b border-rule-soft py-3">
                  <span className="num block font-mono text-[13px] text-ink">{e.path}</span>
                  <span className="mt-1 block text-[14px] leading-snug text-ink-2">{e.gives}</span>
                  <span className="num mt-1.5 block font-mono text-[12px] leading-snug text-ink-3">
                    {e.limit} · {e.params}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-3 hidden md:block">
              <table className="w-full border-collapse">
                <caption className="sr-only">Every public endpoint, what it returns, its rate limit and its query parameters</caption>
                <thead>
                  <tr className="border-b border-ink">
                    <th scope="col" className="label pb-2 pr-4 text-left text-ink-3">Route</th>
                    <th scope="col" className="label pb-2 pr-4 text-left text-ink-3">Returns</th>
                    <th scope="col" className="label pb-2 pr-4 text-left text-ink-3">Limit</th>
                    <th scope="col" className="label pb-2 text-left text-ink-3">Parameters</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((e) => (
                    <tr key={e.path} className="border-b border-rule-soft align-top">
                      <th scope="row" className="py-3 pr-4 text-left font-normal">
                        <span className="num whitespace-nowrap font-mono text-[13px] text-ink">{e.path}</span>
                      </th>
                      <td className="py-3 pr-4 text-[14px] leading-snug text-ink-2">{e.gives}</td>
                      <td className="num whitespace-nowrap py-3 pr-4 font-mono text-[12px] text-ink-3">{e.limit}</td>
                      <td className="num py-3 font-mono text-[12px] text-ink-3">{e.params}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-3">
              Alias ids on the dossier routes 308 to the canonical actor. Every JSON route carries an ETag and answers 304 to a matching If-None-Match.
            </p>
          </section>

          <Ref id="api-try" label="Try it">
            <ol className="divide-y divide-rule-soft">
              {EXAMPLES.map((e) => (
                <li key={e.label} className="py-5 first:pt-0">
                  <div className="min-w-0">
                    <h3 className="font-display text-[1.05rem] font-bold leading-tight text-ink">{e.label}</h3>
                    <pre className="ink-box mt-2 whitespace-pre-wrap bg-paper-deep py-3 pl-[calc(1rem+5ch)] pr-4 font-mono text-[11.5px] leading-relaxed sm:text-[12px] text-ink [overflow-wrap:anywhere] [text-indent:-5ch]">
                      <code>{e.cmd}</code>
                    </pre>
                    <p className="mt-2 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-2">{e.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Ref>

          <Ref id="api-params" label="Parameters">
            <div className="space-y-8">
              {PARAMS.map((p) => (
                <div key={p.route}>
                  <h3 className="num rule-b inline-block pb-1 font-mono text-[13px] text-ink">{p.route}</h3>
                  <dl className="mt-2 divide-y divide-rule-soft">
                    {p.items.map((it) => (
                      <div key={it.name} className="grid gap-x-5 gap-y-1 py-2.5 sm:grid-cols-[13rem_1fr]">
                        <dt className="num font-mono text-[12.5px] text-ink">{it.name}</dt>
                        <dd className="max-w-[60ch] text-[13.5px] leading-relaxed text-ink-2">{it.note}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Ref>

          <Ref id="api-fields" label="Item fields">
            <dl className="divide-y divide-rule-soft">
              {FIELDS.map((f) => (
                <div key={f.name} className="grid gap-x-5 gap-y-1 py-3 sm:grid-cols-[13rem_1fr]">
                  <dt className="num font-mono text-[12.5px] leading-snug text-ink">
                    {f.name}
                    <span className="block text-ink-3">{f.type}</span>
                  </dt>
                  <dd className="max-w-[60ch] text-[13.5px] leading-relaxed text-ink-2">{f.note}</dd>
                </div>
              ))}
            </dl>
          </Ref>

          <Ref id="api-honesty" label="Honesty notes">
            <ul className="divide-y divide-rule-soft">
              <li className="py-3 first:pt-0">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">null means unknown, never zero.</strong> A missing severity or CVSS
                is a gap in the public record, not a low score.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">kev beats epss.</strong> EPSS predicts the next 30 days; KEV records
                exploitation already seen. When they disagree, KEV is the one to act on.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">exposure is a scan count.</strong> It measures hosts reachable on the
                internet on the date given — not hosts that are vulnerable, and not an inventory.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">The dossier exports carry no scoring of ours.</strong> Every technique in a
                Navigator layer scores the same, because we hold no per-technique confidence or frequency and a graded
                heatmap would be invented. STIX object ids are deterministic (UUIDv5), so re-fetching a dossier diffs
                against the last one instead of looking like a fresh set of objects, and re-pulling a TAXII collection or a
                MISP event deduplicates instead of piling up copies.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Cited means quoted.</strong> Every relationship in the STIX, TAXII and
                MISP exports is one sentence in one report we can link to, and carries both. A row with no source URL is never
                published, and a citation naming an actor we hold no dossier for is left out rather than turned into a new
                group named after free text. <code className="font-mono text-[13px]">confidence</code> is 85 when the quoted
                sentence names the actor itself, 50 when the actor comes from the rest of the report, and absent when we do not know.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">exploits is our word, not STIX&apos;s.</strong> STIX 2.1 suggests{" "}
                <code className="font-mono text-[13px]">targets</code> between an intrusion-set and a vulnerability; we say{" "}
                <code className="font-mono text-[13px]">exploits</code>, because that is what the quoted sentences say. Custom
                relationship types are valid STIX; a tool that only accepts the suggested ones may drop these links.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">az-claims are claims.</strong> Each is a report labelled{" "}
                <code className="font-mono text-[13px]">unverified-claim</code> at confidence 15: a hacktivist channel or leak site
                saying it hit an Azerbaijani target, not a confirmed incident. Dark-web sources are never in it.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">TAXII URLs end in a slash and answer with a 308.</strong> The spec
                writes them with a trailing slash; this site serves them without one, so a client must follow the redirect.
                taxii2-client and OpenCTI do; with curl, pass <code className="font-mono text-[13px]">-L</code>. The server is
                read-only: there is no write endpoint and no key.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">We are not the source.</strong> Every item links to the original
                report. Cite that, not us.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">A failure is a 503, never an empty list.</strong> If the feed is
                unavailable you get an error. A <code className="font-mono text-[13px]">200</code> with no items means nothing matched, and you can rely on
                that difference.
              </p>
              </li>
              <li className="py-3">
                <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Filters cover the whole archive.</strong> <code className="font-mono text-[13px]">kev</code>,{" "}
                <code className="font-mono text-[13px]">cve</code>, <code className="font-mono text-[13px]">category</code>, <code className="font-mono text-[13px]">since</code> and <code className="font-mono text-[13px]">before</code> run against every
                published story, and <code className="font-mono text-[13px]">total_matching</code> is the exact count. One response reads at most{" "}
                <code className="font-mono text-[13px]">window.size</code> matching stories; when <code className="font-mono text-[13px]">window.complete</code> is false, page on with{" "}
                <code className="font-mono text-[13px]">next_before</code>.
              </p>
              </li>
            </ul>
          </Ref>
        </div>

        <div className="mt-[var(--sp-section)]">
          <CtaBand source="api-docs" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
