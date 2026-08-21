import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GLOSSARY } from "@/lib/glossary";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 86400; // static reference content

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/lugat", dil, en,
    azTitle: "Kibertəhlükəsizlik lüğəti — sadə izahlar",
    enTitle: "Cybersecurity glossary (Azerbaijani + English)",
    azDesc: "Kibertəhlükəsizlik terminlərinin sadə Azərbaycan dilində izahı: ransomware, phishing, CVE, APT, 2FA və daha çox — hər termin ayrıca səhifədə.",
    enDesc: "Plain-language cybersecurity terms explained in Azerbaijani and English: ransomware, phishing, CVE, APT, 2FA and more — one page per term.",
  });
}

export default async function GlossaryPage() {
  const en = (await getLocale()) === "en";
  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
          {en ? "Glossary" : "Lüğət"}
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl text-ink-primary sm:text-4xl">
          {en ? "Cybersecurity terms, in plain language" : "Kibertəhlükəsizlik terminləri — sadə dildə"}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {en
            ? "The words you keep seeing in security news, explained simply — in Azerbaijani and English."
            : "Təhlükəsizlik xəbərlərində rast gəldiyin sözlər — sadə şəkildə, Azərbaycan və İngilis dilində izah olunur."}
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/lugat/${g.slug}`}
                className="group block rounded-lg border border-hairline bg-surface-raised p-4 transition-colors hover:border-brand"
              >
                <span className="font-headline text-base font-semibold text-ink-primary group-hover:text-brand">
                  {g.term}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-ink-secondary line-clamp-2">
                  {en ? g.en : g.az}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12 border-t border-hairline pt-6 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? `${GLOSSARY.length} terms · part of ctiaze — Azerbaijan's cyber-threat intelligence.`
            : `${GLOSSARY.length} termin · ctiaze-nin bir hissəsi — Azərbaycan kiber-təhlükə kəşfiyyatı.`}
        </p>
      </main>
      <Footer />
    </div>
  );
}
