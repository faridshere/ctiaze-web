import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ActorDossier } from "@/components/ActorDossier";
import { ActorPlaybook } from "@/components/ActorPlaybook";
import { AttackRose } from "@/components/AttackRose";
import { getActorByIdCached as getActorById, originLabel } from "@/lib/threatactors";
import { getLocale } from "@/lib/i18n-server";
import { jsonLdSafe } from "@/lib/format";
import { getQaForActor } from "@/lib/qa";
import { QaBlock, faqPageJsonLd } from "@/components/QaBlock";
import { SeeAlso } from "@/components/SeeAlso";

export const revalidate = 3600;
export const dynamicParams = true;
// Render on demand and cache (ISR) rather than as a per-request function — there
// are too many of these to prerender at build, but caching them keeps crawler
// traffic off Fluid Active CPU.
export async function generateStaticParams() {
  return [];
}

const BASE = "https://skopnix.com";

function desc(a: NonNullable<Awaited<ReturnType<typeof getActorById>>>, en: boolean): string {
  return ((en ? a.description_en || a.description_az : a.description_az || a.description_en) || "").slice(0, 300);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getActorById(slug);
  // Real 404 for an unknown actor slug (not a 200 soft-404 that crawlers index).
  // getActorById is cache()-wrapped, so the body's identical call is free.
  if (!a) notFound();
  const en = (await getLocale()) === "en";
  const title = en ? `${a.name} — threat actor profile` : `${a.name} — təhdid aktoru`;
  const url = `${BASE}/actors/${a._id}`;
  // Self-canonical per ?dil= variant so both languages get indexed (see the xeber
  // page for the full rationale); bare URL keeps the bare canonical + x-default.
  const canonical = url;
  return {
    title,
    description: desc(a, en) || (en ? `Threat-actor dossier for ${a.name}.` : `${a.name} təhdid aktoru haqqında dossye.`),
    alternates: { canonical, languages: { az: `${url}?dil=az`, en: `${url}?dil=en`, "x-default": url } },
    openGraph: { title, url: canonical, type: "profile" },
  };
}

export default async function ActorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActorById(slug);
  if (!a) notFound();
  const locale = await getLocale();
  const en = locale === "en";
  const origin = originLabel(a, locale);

  // Grounded Q&A pairs for this actor (bilingual, engine-authored) — powers both
  // the visible FAQ and the FAQPage rich-result markup below.
  const qa = await getQaForActor(a._id, en);

  // A defensible entity description for search / answer engines: what a source
  // states, nothing invented — same honesty stance as the rest of the product.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: en ? `${a.name} — threat actor profile` : `${a.name} — təhdid aktoru profili`,
    about: { "@type": "Thing", name: a.name, alternateName: (a.aliases || []).slice(0, 8) },
    description: desc(a, en),
    inLanguage: en ? "en" : "az",
    isPartOf: { "@type": "WebSite", name: "skopnix", url: BASE },
    url: `${BASE}/actors/${a._id}`,
    ...(a.last_refreshed ? { dateModified: new Date(a.last_refreshed).toISOString() } : {}),
  };
  const faqLd = qa.length ? faqPageJsonLd(qa) : null;

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
        {faqLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(faqLd) }} />
        )}
        <nav className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link href="/actors" className="hover:text-brand">{en ? "Threat actors" : "Təhdid aktorları"}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-secondary">{a.name}</span>
        </nav>
        <div className="mt-3 flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-headline text-3xl font-bold text-ink-primary sm:text-4xl">
              {a.name}
              {origin ? <span className="ml-2 align-middle font-mono text-sm font-normal text-ink-muted">· {origin}</span> : null}
            </h1>
            {(en ? a.tagline?.en || a.tagline?.az : a.tagline?.az || a.tagline?.en) ? (
              <p className="mt-3 max-w-[52ch] border-l-2 border-brand/60 pl-3 text-[15px] leading-relaxed text-ink-secondary">
                {en ? a.tagline?.en || a.tagline?.az : a.tagline?.az || a.tagline?.en}
              </p>
            ) : null}
          </div>
          {(a.techniques?.length ?? 0) > 0 ? (
            <AttackRose
              actor={a}
              className="mx-auto size-40 shrink-0 sm:mx-0 sm:size-44"
              title={en ? `${a.name} — attack rose from real ATT&CK techniques` : `${a.name} — real ATT&CK texnikalarından hücum qızılgülü`}
            />
          ) : null}
        </div>
        {(en ? a.intel?.en || a.intel?.az : a.intel?.az || a.intel?.en) ? (
          <div
            data-sc
            className="mt-8 border border-hairline border-l-2 border-l-accent-good/70 bg-surface-raised p-4"
            style={{ borderRadius: "var(--radius-chip)" }}
          >
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-good">
              {en ? "Analyst brief" : "Analitik qeyd"}
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-secondary">
              {en ? a.intel?.en || a.intel?.az : a.intel?.az || a.intel?.en}
            </p>
          </div>
        ) : null}
        <div className="mt-8">
          <ActorDossier a={a} locale={locale} standalone />
        </div>
        <ActorPlaybook a={a} en={en} />
        <QaBlock items={qa} en={en} />
        {/* cross-knowledge mesh — bge-m3 neighbours (kb_related), only live routes */}
        <SeeAlso sourceType="actor" sourceId={a._id} en={en} />
        <p className="mt-8 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? "Every claim on this page is drawn from the cited source (MISP Galaxy, MITRE ATT&CK, ransomware.live) — no attribution is invented."
            : "Bu səhifədəki hər iddia göstərilən mənbədən götürülüb (MISP Galaxy, MITRE ATT&CK, ransomware.live) — heç bir atribusiya uydurulmayıb."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
