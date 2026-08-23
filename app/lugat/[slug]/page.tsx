import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GLOSSARY } from "@/lib/glossary";
import { getTermAny, siblingTermsAny } from "@/lib/glossary-db";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 86400;

export function generateStaticParams() {
  return GLOSSARY.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const g = await getTermAny(slug);
  if (!g) notFound();
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: `/lugat/${g.slug}`, dil, en,
    azTitle: `${g.term} nədir? — ctiaze lüğət`,
    enTitle: `What is ${g.term}? — ctiaze glossary`,
    azDesc: g.az.slice(0, 160),
    enDesc: (g.en || g.az).slice(0, 160),
  });
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await getTermAny(slug);
  if (!g) notFound();
  const en = (await getLocale()) === "en";
  const siblings = await siblingTermsAny(slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: g.term,
    description: en ? g.en : g.az,
    inDefinedTermSet: "https://ctiaze.tech/lugat",
    url: `https://ctiaze.tech/lugat/${g.slug}`,
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      <Header />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <nav className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link href="/lugat" className="hover:text-brand">{en ? "Glossary" : "Lüğət"}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-secondary">{g.term}</span>
        </nav>
        <h1 className="mt-3 font-headline text-3xl text-ink-primary sm:text-4xl">
          {en ? `What is ${g.term}?` : `${g.term} nədir?`}
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-ink-primary">{en && g.en ? g.en : g.az}</p>
        {/* Show the other language too — bilingual reference value + more indexable text */}
        {(en ? g.az : g.en) ? (
          <p className="mt-4 border-l-2 border-hairline pl-4 text-[15px] leading-relaxed text-ink-secondary">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{en ? "Azərbaycanca" : "English"}: </span>
            {en ? g.az : g.en}
          </p>
        ) : null}

        <div className="mt-10 border-t border-hairline pt-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
            {en ? "More terms" : "Digər terminlər"}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/lugat/${s.slug}`}
                  className="rounded-full border border-hairline bg-surface px-3 py-1 font-mono text-[12px] text-ink-secondary transition-colors hover:border-brand hover:text-brand"
                >
                  {s.term}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
