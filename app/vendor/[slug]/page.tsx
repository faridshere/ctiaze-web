import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getVendor, getVendors } from "@/lib/vendors";
import { cveBadges, kevSet } from "@/lib/cveintel";
import { cveIntelIdSet } from "@/lib/cveintel-page";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 86400;

const BASE = "https://ctiaze.tech";

// How many CVEs to render on a hub. Microsoft alone carries ~1,560 — an
// unbounded list would be a huge DOM and blow past the FIRST EPSS batch limit
// (100/request). Known-exploited first, then newest, so the cap keeps the CVEs
// that matter; the count line says how many were tracked in total.
const CVE_CAP = 60;

// Prerender the ~150 vendors with the most CVEs (mirrors how /cve/[id] prerenders
// its top-priority ids); the remaining ~223 hubs fill in on demand via ISR
// (dynamicParams stays at its default). This also bounds build-time EPSS calls.
export async function generateStaticParams() {
  const vendors = await getVendors().catch(() => []);
  return vendors.slice(0, 150).map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dil?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVendor(slug);
  // Real 404 for an unknown slug (not a 200 soft-404 that crawlers index).
  if (!v) notFound();
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  const overview = en ? v.en || v.az : v.az || v.en;
  return localizedMeta({
    path: `/vendor/${v.slug}`,
    dil,
    en,
    azTitle: `${v.name} təhlükəsizlik zəiflikləri`,
    enTitle: `${v.name} security vulnerabilities`,
    azDesc: (
      overview ||
      `${v.name} üzrə açıqlanmış CVE-lər və azərbaycanca izahlar.`
    ).slice(0, 160),
    enDesc: (
      overview || `Disclosed CVEs for ${v.name} with grounded explainers.`
    ).slice(0, 160),
  });
}

function pct(epss: number | null): string | null {
  if (epss == null) return null;
  const p = epss * 100;
  return `${p.toFixed(p < 1 ? 2 : 0)}%`;
}

export default async function VendorHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = await getVendor(slug);
  if (!v) notFound();
  const en = (await getLocale()) === "en";

  const lead = en ? v.en || v.az : v.az || v.en;
  const other = en ? v.az : v.en;
  const url = `${BASE}/vendor/${v.slug}`;

  // Known-exploited first (CISA KEV, one cached file), preserving the lib's
  // newest-first base order within each group (Array.sort is stable). Then cap,
  // and fetch KEV+EPSS chips and explainer-existence only for the shown set.
  const kev = await kevSet().catch(() => new Set<string>());
  const sorted = [...v.cves].sort((a, b) => (kev.has(b) ? 1 : 0) - (kev.has(a) ? 1 : 0));
  const shown = sorted.slice(0, CVE_CAP);
  const [badges, linkable] = await Promise.all([
    cveBadges(shown).catch(() => new Map()),
    cveIntelIdSet(shown).catch(() => new Set<string>()),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: en
      ? `${v.name} security vulnerabilities`
      : `${v.name} təhlükəsizlik zəiflikləri`,
    about: { "@type": "Thing", name: v.name },
    description: (lead || "").slice(0, 300),
    inLanguage: en ? "en" : "az",
    isPartOf: { "@type": "WebSite", name: "skopnix", url: BASE },
    url,
    mainEntityOfPage: url,
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
      />
      <Header />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20">
        <nav className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link href="/vendor" className="hover:text-brand">
            {en ? "Vendors" : "Vendorlar"}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-secondary">{v.name}</span>
        </nav>

        {/* (1) vendor name + overview */}
        <h1 className="mt-3 font-headline text-3xl font-bold text-ink-primary sm:text-4xl">
          {en ? `${v.name} vulnerabilities` : `${v.name} zəiflikləri`}
        </h1>
        {v.cves.length > 0 && (
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.14em] text-brand">
            {en
              ? `${v.cves.length} CVE${v.cves.length === 1 ? "" : "s"} tracked`
              : `${v.cves.length} CVE izlənir`}
          </p>
        )}
        {lead && (
          <p className="mt-6 max-w-[62ch] text-[15px] leading-relaxed text-ink-primary">
            {lead}
          </p>
        )}
        {/* Show the other language too — bilingual reference value + indexable text.
            Guard other !== lead so a doc missing one language (2 lack EN) doesn't
            echo the same text twice when the lead has fallen back to it. */}
        {other && other !== lead && (
          <p className="mt-4 max-w-[62ch] border-l-2 border-hairline pl-4 text-[14px] leading-relaxed text-ink-secondary">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              {en ? "Azərbaycanca" : "English"}:{" "}
            </span>
            {other}
          </p>
        )}

        {/* (2) the vendor's CVEs — KEV-first, linked only when an explainer exists */}
        {shown.length > 0 && (
          <section data-sc className="mt-12">
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
              {en ? "This vendor's CVEs" : "Bu vendorun CVE-ləri"}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              <span className="font-normal text-ink-muted">{shown.length}</span>
            </h2>
            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {shown.map((cve) => {
                const b = badges.get(cve);
                const isKev = Boolean(b?.kev) || kev.has(cve);
                const ep = pct(b?.epss ?? null);
                const chips = (
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em]">
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
                  </span>
                );
                const label = (
                  <span className="truncate font-mono text-[13px] text-ink-primary group-hover:text-brand">
                    {cve}
                  </span>
                );
                return (
                  <li key={cve}>
                    {linkable.has(cve) ? (
                      <Link
                        href={`/cve/${cve}`}
                        className="sweepable group flex items-center gap-2 border border-hairline bg-surface-raised p-3 transition-colors hover:border-brand/50"
                        style={{ borderRadius: "var(--radius-chip)" }}
                      >
                        {label}
                        {chips}
                      </Link>
                    ) : (
                      <div
                        className="flex items-center gap-2 border border-hairline bg-surface p-3"
                        style={{ borderRadius: "var(--radius-chip)" }}
                      >
                        {label}
                        {chips}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {v.cves.length > shown.length && (
              <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                {en
                  ? `Showing the top ${shown.length} of ${v.cves.length} — known-exploited and newest first.`
                  : `${v.cves.length} CVE-dən ${shown.length}-i göstərilir — aktiv istismar olunanlar və ən yenilər önə çıxır.`}
              </p>
            )}
          </section>
        )}

        {/* (3) honesty footer — grounded provenance only */}
        <p className="mt-14 border-t border-hairline pt-8 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? `This hub is built from skopnix's own reporting on ${v.name}: the overview is AI-written from that coverage and every CVE links to its grounded explainer. KEV status comes from CISA's Known Exploited Vulnerabilities catalog and EPSS from FIRST — vendor, version and score details are never invented.`
            : `Bu səhifə skopnix-nin ${v.name} üzrə öz reportajından qurulub: icmal həmin materiallar əsasında süni intellektlə yazılıb və hər CVE öz əsaslandırılmış izahına keçid verir. KEV statusu CISA-nın istismar olunan zəifliklər kataloqundan, EPSS isə FIRST-dən götürülür — vendor, versiya və bal detalları uydurulmur.`}
        </p>
      </main>
      <Footer />
    </div>
  );
}
