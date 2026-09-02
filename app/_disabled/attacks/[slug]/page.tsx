import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  getGuide,
  getGuideEvidence,
  siblingGuides,
  stripCitations,
} from "@/lib/guides";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";
import { breadcrumbLd } from "@/lib/jsonld";
import { SeeAlso } from "@/components/SeeAlso";

export const revalidate = 604800;

const BASE = "https://skopnix.com";

export const dynamicParams = true;

// Render on-demand (ISR) instead of prerendering every page at build — the
// per-page Mongo aggregation is slow and was timing the build out (>60s/page).
// Any slug still generates on first request and caches (revalidate above).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGuide(slug);
  // Real 404 for an unknown attack-type slug (not a soft-404 crawlers index).
  // getGuide is cache()-wrapped, so the body's identical call is free.
  if (!g) notFound();
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: `/attacks/${g.slug}`,
    en,
    azTitle: `${g.attackType} nədir? — necə işləyir və qorunma`,
    enTitle: `What is ${g.attackType}? — how it works and how to defend`,
    azDesc: g.az.what.slice(0, 160),
    enDesc: (g.en.what || g.az.what).slice(0, 160),
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = await getGuide(slug);
  if (!g) notFound();
  const en = (await getLocale()) === "en";
  const c = en ? g.en : g.az;
  const evidence = await getGuideEvidence(slug);
  const siblings = await siblingGuides(slug);
  const evidenceProse = stripCitations(c.evidence);

  // Grounded, defensible structured data: an Article for the explainer plus a
  // HowTo whose steps ARE the defense checklist (both from the engine's output,
  // nothing invented here). @graph keeps them in one block.
  const article = {
    "@type": "Article",
    headline: en ? `What is ${g.attackType}?` : `${g.attackType} nədir?`,
    about: { "@type": "Thing", name: g.attackType },
    description: c.what,
    inLanguage: en ? "en" : "az",
    isPartOf: { "@type": "WebSite", name: "skopnix", url: BASE },
    url: `${BASE}/attacks/${g.slug}`,
  };
  const howTo = c.checklist.length
    ? {
        "@type": "HowTo",
        name: en
          ? `How to defend against ${g.attackType}`
          : `${g.attackType} hücumundan necə qorunmaq`,
        step: c.checklist.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          text: s,
        })),
      }
    : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [article, ...(howTo ? [howTo] : [])],
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Attack types", path: "/attacks" }, { name: g.attackType, path: `/attacks/${slug}` }])) }} />
      <Header />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <nav className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link href="/attacks" className="hover:text-brand">
            {en ? "Attack types" : "Hücum növləri"}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-secondary">{g.attackType}</span>
        </nav>

        <h1 className="mt-3 font-headline text-3xl text-ink-primary sm:text-4xl">
          {en ? `What is ${g.attackType}?` : `${g.attackType} nədir?`}
        </h1>

        {/* WHAT — lead answer */}
        <p className="mt-6 text-lg leading-relaxed text-ink-primary">{c.what}</p>

        {/* HOW IT WORKS */}
        {c.how ? (
          <section data-sc className="mt-10">
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
              {en ? "How it works" : "Necə işləyir"}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">{c.how}</p>
          </section>
        ) : null}

        {/* DEFENSE CHECKLIST — numbered ledger, matching the actor kill-chain playbook */}
        {c.checklist.length ? (
          <section data-sc className="mt-10">
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
              {en ? "Defense checklist" : "Qorunma addımları"}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              <span className="font-normal text-ink-muted">{c.checklist.length}</span>
            </h2>
            <ol className="mt-4 space-y-3">
              {c.checklist.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-3 border border-hairline border-l-2 border-l-brand/60 bg-surface-raised p-4"
                  style={{ borderRadius: "var(--radius-chip)" }}
                >
                  <span className="font-mono text-[11px] font-bold text-brand">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[14px] leading-relaxed text-ink-secondary">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* EVIDENCE — grounded prose (citation markers stripped) + real sources */}
        {evidenceProse || evidence.length ? (
          <section data-sc className="mt-10">
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
              {en ? "Real-world evidence" : "Real nümunələr"}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </h2>
            {evidenceProse ? (
              <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">
                {evidenceProse}
              </p>
            ) : null}

            {evidence.length ? (
              <>
                <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
                  {en ? "Sources" : "Mənbələr"}
                </h3>
                <ul className="mt-3 space-y-2">
                  {evidence.map((s) => {
                    const title = (en ? s.titleEn : s.titleAz) || s.titleEn;
                    const inner = (
                      <>
                        <span
                          aria-hidden
                          className="mt-0.5 shrink-0 font-mono text-[10px] text-brand"
                        >
                          ▸
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-[13.5px] leading-relaxed text-ink-secondary">
                            {title}
                          </span>
                          {s.source ? (
                            <span className="ml-2 font-mono text-[10.5px] uppercase tracking-wider text-ink-muted">
                              {s.source}
                            </span>
                          ) : null}
                        </span>
                      </>
                    );
                    return (
                      <li key={s.id}>
                        {s.href ? (
                          <Link
                            href={s.href}
                            className="group flex gap-2 border border-hairline bg-surface-raised p-3 transition-colors hover:border-brand/50"
                            style={{ borderRadius: "var(--radius-chip)" }}
                          >
                            {inner}
                          </Link>
                        ) : (
                          // Not published on the site → plain source label, never a
                          // broken /news link. (Most evidence items are raw ingested
                          // sources that never went through the AZ publish pipeline.)
                          <div
                            className="flex gap-2 border border-hairline border-dashed bg-surface p-3"
                            style={{ borderRadius: "var(--radius-chip)" }}
                          >
                            {inner}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        {/* SIBLING GUIDES */}
        {siblings.length ? (
          <div className="mt-12 border-t border-hairline pt-6">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
              {en ? "Other attack types" : "Digər hücum növləri"}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/attacks/${s.slug}`}
                    className="rounded-full border border-hairline bg-surface px-3 py-1 font-mono text-[12px] text-ink-secondary transition-colors hover:border-brand hover:text-brand"
                  >
                    {s.attackType}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* cross-knowledge mesh — bge-m3 neighbours (kb_related), only live routes */}
        <SeeAlso sourceType="concept" sourceId={slug} en={en} />

        {/* HONESTY FOOTER — AI-written from the cited source items, nothing invented */}
        <p className="mt-10 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? "This guide is AI-written from the real incident sources skopnix collected — the examples above are drawn from those cited items, nothing is invented."
            : "Bu bələdçi skopnix-nin topladığı real hadisə mənbələrindən AI ilə yazılıb — yuxarıdakı nümunələr göstərilən mənbələrdən götürülüb, heç nə uydurulmayıb."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
