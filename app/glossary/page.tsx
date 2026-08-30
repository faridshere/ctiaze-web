import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAllTerms } from "@/lib/glossary-db";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 86400; // reference content; full DO catalogue via ISR

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/glossary", dil, en,
    azTitle: "Kibertəhlükəsizlik lüğəti — sadə izahlar",
    enTitle: "Cybersecurity glossary (Azerbaijani + English)",
    azDesc: "Kibertəhlükəsizlik terminlərinin sadə Azərbaycan dilində izahı: ransomware, phishing, CVE, APT, 2FA və daha çox — hər termin ayrıca səhifədə.",
    enDesc: "Plain-language cybersecurity terms explained in Azerbaijani and English: ransomware, phishing, CVE, APT, 2FA and more — one page per term.",
  });
}

export default async function GlossaryPage() {
  const en = (await getLocale()) === "en";
  const terms = await getAllTerms();

  // Group by first letter for the field-index rail (Azerbaijani letters kept
  // as-is — the catalogue is EN-term-keyed, so A–Z covers it; digits under #).
  const groups = new Map<string, typeof terms>();
  for (const t of terms) {
    const ch = t.term[0]?.toUpperCase() ?? "#";
    const key = /[A-ZƏİÖÜĞŞÇ]/.test(ch) ? ch : "#";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  const letters = [...groups.keys()].sort((a, b) => a.localeCompare(b, "en"));

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.24em] text-brand">
          <span aria-hidden className="h-px w-5 bg-brand" />
          {en ? "Field glossary" : "Sahə lüğəti"}
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl font-bold uppercase text-ink-primary sm:text-4xl">
          {en ? "Cybersecurity terms, in plain language" : "Kibertəhlükəsizlik terminləri — sadə dildə"}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {en
            ? `${terms.length} terms explained simply, in Azerbaijani and English — each on its own page.`
            : `${terms.length} termin — sadə dildə, Azərbaycan və İngilis dilində. Hər termin ayrıca səhifədə.`}
        </p>

        {/* letter rail */}
        <nav
          aria-label={en ? "Alphabetical index" : "Əlifba indeksi"}
          className="sticky top-12 z-10 -mx-4 mt-8 overflow-x-auto border-y border-hairline bg-surface px-4 py-2"
        >
          <ul className="flex gap-1 font-mono text-[11px]">
            {letters.map((L) => (
              <li key={L}>
                <a
                  href={`#lugat-${L === "#" ? "num" : L}`}
                  className="block px-2 py-1 uppercase text-ink-muted transition-colors hover:bg-brand-wash hover:text-brand"
                  style={{ borderRadius: "var(--radius-chip)" }}
                >
                  {L}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {letters.map((L) => (
          <section key={L} id={`lugat-${L === "#" ? "num" : L}`} className="scroll-mt-24">
            <h2 className="mt-10 flex items-baseline gap-3 font-headline text-xl font-bold text-brand">
              {L}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[11px] font-normal tracking-widest text-ink-muted">
                {groups.get(L)!.length}
              </span>
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groups.get(L)!.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/glossary/${g.slug}`}
                    className="sweepable group block border border-hairline bg-surface-raised p-4 transition-colors hover:border-brand/50"
                    style={{ borderRadius: "var(--radius-chip)" }}
                  >
                    <span className="flex items-center gap-2 font-mono text-sm font-medium text-ink-primary group-hover:text-brand">
                      <span aria-hidden className="text-[10px] text-brand transition-transform group-hover:translate-x-0.5">▸</span>
                      {g.term}
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-secondary line-clamp-2">
                      {en && g.en ? g.en : g.az}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-12 border-t border-hairline pt-6 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? `${terms.length} terms · part of skopnix — global cyber-threat intelligence.`
            : `${terms.length} termin · skopnix-nin bir hissəsi — Azərbaycan kiber-təhlükə kəşfiyyatı.`}
        </p>
      </main>
      <Footer />
    </div>
  );
}
