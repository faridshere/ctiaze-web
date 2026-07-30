import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SeverityMarker } from "@/components/SeverityMarker";
import { ThreatActorCard } from "@/components/ThreatActorCard";
import { IocPanel } from "@/components/IocPanel";
import { formatStoryDate } from "@/lib/format";
import { getStoryBySlug } from "@/lib/stories";
import { extractIocs } from "@/lib/ioc";
import { detectActors, enrichmentPivots } from "@/lib/actors";

export const revalidate = 180;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: "Tapılmadı" };
  return {
    title: story.titleAz,
    description: story.bodyAz.slice(0, 160),
    openGraph: {
      title: story.titleAz,
      description: story.bodyAz.slice(0, 160),
      type: "article",
      publishedTime: story.publishedAt,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const { time, date } = formatStoryDate(story.publishedAt);

  // Threat intelligence derived from the story: indicators lifted from the text,
  // the actor(s) named in it, and pivot terms to pull live indicators for.
  const iocText = [story.titleAz, story.titleEn, story.bodyAz];
  const extracted = extractIocs(...iocText);
  const actors = detectActors(...iocText);
  const pivots = enrichmentPivots(...iocText);
  const hasIntel = extracted.length > 0 || actors.length > 0 || pivots.length > 0;

  // Structured data — makes each story eligible as a rich/citable result for
  // search + AI answer engines (the per-CVE Azerbaijani long-tail).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.titleAz,
    datePublished: story.publishedAt,
    dateModified: story.publishedAt,
    inLanguage: "az",
    author: { "@type": "Organization", name: "Hackxana" },
    publisher: { "@type": "Organization", name: "ctiaze" },
    mainEntityOfPage: `https://ctiaze.tech/xeber/${story.slug}`,
    ...(story.bodyAz ? { description: story.bodyAz.slice(0, 200) } : {}),
    ...(story.cveIds.length
      ? { about: story.cveIds.map((c) => ({ "@type": "Thing", name: c })) }
      : {}),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-12">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink-primary transition-colors"
        >
          ← bütün dispaçlar
        </Link>

        <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] text-ink-muted">
          <time dateTime={story.publishedAt}>
            {date} · {time}
          </time>
          <SeverityMarker kev={story.kev} severity={story.severity} />
          <span className="uppercase tracking-wider">{story.category}</span>
          {story.region && <span className="text-ink-secondary">AZ</span>}
          {story.cveIds[0] && <span>{story.cveIds[0]}</span>}
        </div>

        <h1 className="mt-4 font-headline text-[2rem] sm:text-[2.6rem] leading-[1.1] text-ink-primary">
          {story.titleAz}
        </h1>

        {story.cveIds.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              CVE
            </span>
            {story.cveIds.map((cve) => (
              <a
                key={cve}
                href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm border border-accent-critical/40 bg-accent-critical/5 px-2 py-0.5 font-mono text-[12px] text-accent-critical hover:bg-accent-critical/10"
                title="NVD-də bax (CVSS, EPSS, təfərrüat)"
              >
                {cve} ↗
              </a>
            ))}
          </div>
        )}

        <div className="mt-6 h-px w-full bg-hairline" />

        <p className="mt-7 text-lg leading-[1.75] text-ink-secondary whitespace-pre-line">
          {story.bodyAz}
        </p>

        <div className="mt-12 pt-6 border-t border-hairline flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-xs text-ink-muted">
          {story.cveIds.length > 0 ? (
            <span className="text-ink-secondary">{story.cveIds.join(" · ")}</span>
          ) : (
            <span />
          )}
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="uppercase tracking-wider text-ink-secondary hover:text-ink-primary transition-colors"
          >
            ilkin mənbə ↗
          </a>
        </div>

        {/* Threat-intelligence inset — a darkroom window under the narrative:
            actor dossier + machine-readable indicators (extracted + live). */}
        {hasIntel && (
          <section className="darkroom mt-10 rounded-xl border border-hairline bg-surface p-5 sm:p-6">
            {actors.length > 0 && (
              <>
                <ThreatActorCard actors={actors} />
                <div className="my-6 h-px w-full bg-hairline" />
              </>
            )}
            <IocPanel extracted={extracted} pivots={pivots} />
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
