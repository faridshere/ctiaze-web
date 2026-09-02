import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getVendors } from "@/lib/vendors";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 86400;

export async function generateMetadata({
}: {
}): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/vendor",
    en,
    azTitle: "Vendor təhlükəsizlik mərkəzləri — CVE-lər azərbaycanca",
    enTitle: "Vendor security hubs — CVEs in Azerbaijani",
    azDesc:
      "Fortinet, Microsoft, Cisco və digər vendorların zəiflikləri (CVE) azərbaycanca izahlarla: hansı boşluqlar açıqlanıb və hansıları aktiv istismar olunur.",
    enDesc:
      "Vulnerabilities (CVEs) for Fortinet, Microsoft, Cisco and other vendors with Azerbaijani explainers: what was disclosed and what is actively exploited.",
  });
}

export default async function VendorIndex() {
  const en = (await getLocale()) === "en";
  const vendors = await getVendors();

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.24em] text-brand">
          <span aria-hidden className="h-px w-5 bg-brand" />
          {en ? "Vendors" : "Vendorlar"}
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl font-bold text-ink-primary sm:text-4xl">
          {en ? "Vendor security hubs" : "Vendor təhlükəsizlik mərkəzləri"}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {en
            ? "Search by vendor to see its disclosed CVEs — known-exploited first — each with a grounded Azerbaijani/English explainer. Built so an admin googling a vendor's vulnerabilities in Azerbaijani actually finds them."
            : "Vendoru seç — açıqlanmış CVE-lərini (aktiv istismar olunanlar önə çıxır) hər biri əsaslandırılmış azərbaycanca/ingiliscə izahı ilə gör. “Fortinet zəiflik” deyə axtaran admin nəhayət nəticə tapsın deyə qurulub."}
        </p>

        {vendors.length > 0 ? (
          <>
            <p className="mt-8 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-muted">
              {en ? `${vendors.length} vendors` : `${vendors.length} vendor`}
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vendors.map((v) => (
                <li key={v.slug}>
                  <Link
                    href={`/vendor/${v.slug}`}
                    className="sweepable group block h-full border border-hairline bg-surface-raised p-4 transition-colors hover:border-brand/50"
                    style={{ borderRadius: "var(--radius-chip)" }}
                  >
                    <span className="flex items-center gap-2 font-headline text-lg font-semibold text-ink-primary group-hover:text-brand">
                      <span
                        aria-hidden
                        className="text-[11px] text-brand transition-transform group-hover:translate-x-0.5"
                      >
                        ▸
                      </span>
                      <span className="min-w-0 truncate">{v.name}</span>
                    </span>
                    {v.cveCount > 0 && (
                      <span className="mt-2 block font-mono text-[12px] text-ink-secondary">
                        {en
                          ? `${v.cveCount} CVE${v.cveCount === 1 ? "" : "s"}`
                          : `${v.cveCount} CVE`}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-10 text-sm text-ink-muted">
            {en ? "Vendor intelligence is being prepared." : "Vendor kəşfiyyatı hazırlanır."}
          </p>
        )}

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? "Each hub is built from skopnix's own CVE reporting: a bilingual overview plus the vendor's tracked CVEs, known-exploited first, each linking to a grounded explainer. KEV comes from CISA and EPSS from FIRST — nothing is invented."
            : "Hər səhifə skopnix-nin öz CVE reportajından qurulur: iki dilli icmal və vendorun izlənən CVE-ləri, aktiv istismar olunanlar önə çıxır, hər biri əsaslandırılmış izaha keçidlə. KEV CISA-dan, EPSS FIRST-dən götürülür — heç nə uydurulmayıb."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
