import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCveIntel, getTopCveIds, type CvePriority } from "@/lib/cveintel-page";
import { cveBadges } from "@/lib/cveintel";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 86400; // explainers are static engine output — daily is plenty

const BASE = "https://ctiaze.tech";

// Prerender the engine's top-priority CVEs (kev > exploited > high > standard);
// the remaining ~7.8k explainer pages fill in on demand via ISR (dynamicParams
// stays at its default).
export async function generateStaticParams() {
  const ids = await getTopCveIds(100).catch(() => []);
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dil?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const doc = await getCveIntel(id);
  // Real 404 for an unknown id (not a 200 soft-404 that crawlers index).
  // getCveIntel is cache()-wrapped, so the body's identical call is free.
  if (!doc) notFound();
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: `/cve/${doc.id}`, dil, en,
    azTitle: `${doc.id} nədir? — izah və müdafiə`,
    enTitle: `What is ${doc.id}? — explainer & defense`,
    azDesc: (doc.az || doc.en).slice(0, 160),
    enDesc: (doc.en || doc.az).slice(0, 160),
  });
}

function pct(epss: number | null): string | null {
  if (epss == null) return null;
  const p = epss * 100;
  return `${p.toFixed(p < 1 ? 2 : 0)}%`;
}

// Bilingual display of the engine's closed-set triage tag (its grounded meaning:
// "exploited" = our own coverage states exploitation; "high" = it states
// critical / severe / RCE / unauthenticated). "kev" renders as the KEV chip.
const PRIORITY_LABEL: Record<Exclude<CvePriority, "kev">, { az: string; en: string }> = {
  exploited: { az: "istismar bildirilib", en: "exploitation reported" },
  high: { az: "yüksək prioritet", en: "high priority" },
  standard: { az: "standart prioritet", en: "standard priority" },
};

function cweUrl(cweId: string): string | null {
  const m = /^CWE-(\d+)$/.exec(cweId);
  return m ? `https://cwe.mitre.org/data/definitions/${m[1]}.html` : null;
}

export default async function CveIntelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getCveIntel(id);
  if (!doc) notFound();
  const en = (await getLocale()) === "en";

  // Live authority badges (CISA KEV set + FIRST EPSS) — same helpers as /cve.
  const badge = (await cveBadges([doc.id]).catch(() => new Map())).get(doc.id);
  const isKev = Boolean(badge?.kev) || doc.priority === "kev";
  const ep = pct(badge?.epss ?? null);
  const prio = doc.priority && doc.priority !== "kev" ? PRIORITY_LABEL[doc.priority] : null;
  const cweHref = doc.cwe ? cweUrl(doc.cwe.id) : null;

  const lead = en ? doc.en || doc.az : doc.az || doc.en;
  const other = en ? doc.az : doc.en;
  const url = `${BASE}/cve/${doc.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: en ? `What is ${doc.id}?` : `${doc.id} nədir?`,
    description: lead.slice(0, 200),
    inLanguage: en ? "en" : "az",
    about: { "@type": "Thing", name: doc.id },
    url,
    mainEntityOfPage: url,
    isPartOf: { "@type": "WebSite", name: "ctiaze", url: BASE },
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      <Header />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <nav className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link href="/cve" className="hover:text-brand">{en ? "CVE registry" : "CVE reyestri"}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-secondary">{doc.id}</span>
        </nav>
        <h1 className="mt-3 font-headline text-3xl text-ink-primary sm:text-4xl">
          {en ? `What is ${doc.id}?` : `${doc.id} nədir?`}
        </h1>

        {/* authority + triage chips — each renders only when the datum exists */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em]">
          {isKev && (
            <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1.5 py-0.5 font-semibold text-surface">
              KEV
            </span>
          )}
          {ep && (
            <span className="rounded-[var(--radius-chip)] border border-ink-secondary px-1.5 py-0.5 text-ink-secondary">
              EPSS {ep}
            </span>
          )}
          {prio && (
            <span
              className={
                doc.priority === "exploited"
                  ? "rounded-[var(--radius-chip)] border border-accent-warning/60 px-1.5 py-0.5 text-accent-warning"
                  : "rounded-[var(--radius-chip)] border border-hairline px-1.5 py-0.5 text-ink-muted"
              }
            >
              {en ? prio.en : prio.az}
            </span>
          )}
          {doc.cwe &&
            (cweHref ? (
              <a
                href={cweHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[var(--radius-chip)] border border-hairline bg-surface px-1.5 py-0.5 text-ink-secondary transition-colors hover:border-brand hover:text-brand"
              >
                {doc.cwe.id}
                {doc.cwe.name ? ` · ${doc.cwe.name}` : ""}
              </a>
            ) : (
              <span className="rounded-[var(--radius-chip)] border border-hairline px-1.5 py-0.5 text-ink-secondary">
                {doc.cwe.id}
                {doc.cwe.name ? ` · ${doc.cwe.name}` : ""}
              </span>
            ))}
        </div>

        <p className="mt-6 text-lg leading-relaxed text-ink-primary">{lead}</p>
        {/* Show the other language too — bilingual reference value + more indexable text */}
        {other ? (
          <p className="mt-4 border-l-2 border-hairline pl-4 text-[15px] leading-relaxed text-ink-secondary">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              {en ? "Azərbaycanca" : "English"}:{" "}
            </span>
            {other}
          </p>
        ) : null}

        {doc.related.length > 0 && (
          <div data-sc className="mt-10 border-t border-hairline pt-6">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
              {en ? "Related CVEs" : "Oxşar CVE-lər"}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {doc.related.slice(0, 12).map((r) => (
                <li key={r.cve}>
                  <Link
                    href={`/cve/${r.cve}`}
                    title={r.reason || undefined}
                    className="sweepable inline-block rounded-full border border-hairline bg-surface px-3 py-1 font-mono text-[12px] text-ink-secondary transition-colors hover:border-brand hover:text-brand"
                  >
                    {r.cve}
                  </Link>
                </li>
              ))}
            </ul>
            {doc.related[0]?.reason ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                {en ? "link basis: " : "əlaqə əsası: "}
                {doc.related[0].reason}
              </p>
            ) : null}
          </div>
        )}

        {/* honest footer — provenance of the explainer + the official record */}
        <div data-sc className="mt-10 border-t border-hairline pt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-[11px] text-ink-muted">
            <span className="text-accent-good">{en ? "grounded ✓" : "əsaslandırılıb ✓"}</span>
            <a
              href={`https://nvd.nist.gov/vuln/detail/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="uppercase tracking-wider transition-colors hover:text-brand"
            >
              NVD ↗
            </a>
          </div>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-muted">
            {en
              ? "This explainer is AI-written from source data — ctiaze's own reporting on this CVE; CVSS scores, vendors and versions are never invented. See NVD for the official record."
              : "Bu izah süni intellekt tərəfindən mənbə məlumatları — ctiaze-nin bu CVE üzrə öz reportajı — əsasında yazılıb; CVSS balı, vendor və versiya detalları uydurulmur. Rəsmi qeyd üçün NVD-yə baxın."}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
