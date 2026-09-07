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
];

const FIELDS: { name: string; type: string; note: string }[] = [
  { name: "id", type: "string", note: "Stable pipeline id. Prefixed cve: / url: / digest: / spike:." },
  { name: "url", type: "string", note: "Permalink on skopnix.com." },
  { name: "source_url", type: "string", note: "The original report. We aggregate and verify; we do not author it." },
  { name: "title_en / title_az", type: "string", note: "English and Azerbaijani headline." },
  { name: "summary_en / summary_az", type: "string", note: "Body text, trimmed to whole sentences." },
  { name: "truncated", type: "boolean", note: "true when the source feed published a cut description and we ended it at the last complete sentence. Fetch source_url for the whole thing." },
  { name: "category", type: "string", note: "exploit, ransomware, breach, vulnerability, other." },
  { name: "severity", type: "string | null", note: "critical / high / medium / low. null means no CVE severity data — not 'low'." },
  { name: "cvss", type: "number | null", note: "As stated by the cited source. null when none was published." },
  { name: "epss", type: "number | null", note: "0-1 probability of exploitation in the next 30 days. A FORECAST." },
  { name: "kev", type: "boolean", note: "On CISA KEV. An OBSERVATION of exploitation, and it outranks epss whenever the two disagree." },
  { name: "cve_ids", type: "string[]", note: "CVEs named in the source. Empty is common — most reporting carries none." },
  { name: "region_relevant", type: "boolean", note: "Flagged as Caspian/regional relevance." },
  { name: "published_at", type: "string", note: "ISO 8601, UTC." },
  { name: "exposure", type: "object | null", note: "{product, worldwide, measured_at} — a Shodan scan count, not an inventory, dated to the day it was measured." },
  { name: "also_reported_by", type: "string[]", note: "Other outlets that ran the same story." },
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
