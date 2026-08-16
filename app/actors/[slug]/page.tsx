import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ActorDossier } from "@/components/ActorDossier";
import { getActorById, originLabel } from "@/lib/threatactors";
import { getLocale } from "@/lib/i18n-server";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 3600;

const BASE = "https://ctiaze.tech";

function desc(a: NonNullable<Awaited<ReturnType<typeof getActorById>>>, en: boolean): string {
  return ((en ? a.description_en || a.description_az : a.description_az || a.description_en) || "").slice(0, 300);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dil?: string }>;
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
  const dil = (await searchParams)?.dil;
  const canonical = dil === "az" ? `${url}?dil=az` : dil === "en" ? `${url}?dil=en` : url;
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

  // A defensible entity description for search / answer engines: what a source
  // states, nothing invented — same honesty stance as the rest of the product.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: en ? `${a.name} — threat actor profile` : `${a.name} — təhdid aktoru profili`,
    about: { "@type": "Thing", name: a.name, alternateName: (a.aliases || []).slice(0, 8) },
    description: desc(a, en),
    inLanguage: en ? "en" : "az",
    isPartOf: { "@type": "WebSite", name: "ctiaze", url: BASE },
    url: `${BASE}/actors/${a._id}`,
    ...(a.last_refreshed ? { dateModified: new Date(a.last_refreshed).toISOString() } : {}),
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
        <nav className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link href="/actors" className="hover:text-brand">{en ? "Threat actors" : "Təhdid aktorları"}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-secondary">{a.name}</span>
        </nav>
        <h1 className="mt-3 font-headline text-3xl text-ink-primary sm:text-4xl">
          {a.name}
          {origin ? <span className="ml-2 align-middle font-mono text-sm text-ink-muted">· {origin}</span> : null}
        </h1>
        <div className="mt-8">
          <ActorDossier a={a} locale={locale} standalone />
        </div>
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
