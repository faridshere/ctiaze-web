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
  // Not advertised until early access opens: out of the sitemap, out of the
  // footer, and out of search. The page still resolves for anyone holding the
  // link, so nothing that already points here breaks.
  robots: { index: false, follow: false },
};

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
  { name: "published_at", type: "string", note: "ISO 8601, UTC." },
  { name: "exposure", type: "object | null", note: "{product, worldwide, measured_at} — a Shodan scan count, not an inventory, dated to the day it was measured." },
  { name: "also_reported_by", type: "string[]", note: "Other outlets that ran the same story." },
  { name: "cluster_id", type: "string | null", note: "Stories about the same event within 72h share one id. null when the item stands alone." },
  { name: "is_duplicate", type: "boolean", note: "true on the later members of a cluster; the first-seen member is false. Filter on false to see one item per event." },
];

export default function ApiDocsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHead narrow kicker="Developers" title="API">
          <p className="mt-6 max-w-[38rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            {INTRO}
          </p>
        </PageHead>

        <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[46rem] px-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-brand align-middle" />
            Try it
          </h2>
          <div className="mt-6 space-y-6">
            {EXAMPLES.map((e) => (
              <div key={e.label}>
                <div className="font-display text-[15px] font-semibold text-ink-primary">{e.label}</div>
                <pre className="mt-2 overflow-x-auto rounded-[var(--radius-panel)] border border-hairline bg-surface-raised/50 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-secondary">
                  <code>{e.cmd}</code>
                </pre>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{e.note}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-[var(--sp-section)] font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-brand align-middle" />
            Fields
          </h2>
          <dl className="mt-6 divide-y divide-hairline border-y border-hairline">
            {FIELDS.map((f) => (
              <div key={f.name} className="py-3.5">
                <dt className="font-mono text-[13px] text-ink-primary">
                  {f.name} <span className="text-ink-muted">· {f.type}</span>
                </dt>
                <dd className="mt-1 max-w-[40rem] text-[13px] leading-relaxed text-ink-secondary">{f.note}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-[var(--sp-section)] font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-brand align-middle" />
            Honesty notes
          </h2>
          <ul className="mt-5 space-y-3 text-[13.5px] leading-relaxed text-ink-secondary">
            <li>
              <strong className="text-ink-primary">null means unknown, never zero.</strong> A missing severity or CVSS
              is a gap in the public record, not a low score.
            </li>
            <li>
              <strong className="text-ink-primary">kev beats epss.</strong> EPSS predicts the next 30 days; KEV records
              exploitation already seen. When they disagree, KEV is the one to act on.
            </li>
            <li>
              <strong className="text-ink-primary">exposure is a scan count.</strong> It measures hosts reachable on the
              internet on the date given — not hosts that are vulnerable, and not an inventory.
            </li>
            <li>
              <strong className="text-ink-primary">The exports carry no scoring of ours.</strong> Every technique in a
              Navigator layer scores the same, because we hold no per-technique confidence or frequency and a graded
              heatmap would be invented. STIX object ids are deterministic (UUIDv5), so re-fetching a dossier diffs
              against the last one instead of looking like a fresh set of objects.
            </li>
            <li>
              <strong className="text-ink-primary">We are not the source.</strong> Every item links to the original
              report. Cite that, not us.
            </li>
            <li>
              <strong className="text-ink-primary">A failure is a 503, never an empty list.</strong> If the feed is
              unavailable you get an error. A <code>200</code> with no items means nothing matched, and you can rely on
              that difference.
            </li>
            <li>
              <strong className="text-ink-primary">matched_in_window is not a total.</strong> Filters run over the most
              recent {"{"}window.size{"}"} stories. <code>window.complete</code> tells you whether that window covered
              the whole archive, so a far-back <code>since</code> cannot quietly look like &ldquo;no results&rdquo;.
            </li>
          </ul>
        </section>

        <div className="mt-[var(--sp-section)]">
          <CtaBand source="api-docs" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
