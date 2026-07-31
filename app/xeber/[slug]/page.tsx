import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlyphChip } from "@/components/GlyphChip";
import { FlagChips } from "@/components/FlagChips";
import { SpektrStrip } from "@/components/SpektrStrip";
import { ThreatActorCard } from "@/components/ThreatActorCard";
import { IocPanel } from "@/components/IocPanel";
import { formatStoryDate } from "@/lib/format";
import { getStoryBySlug, getStories } from "@/lib/stories";
import { extractIocs, type IocType } from "@/lib/ioc";
import { detectActors, specificPivots } from "@/lib/actors";
import { lookupThreatFox, type TfKind } from "@/lib/threatfox";
import { outletCode, outletHost } from "@/lib/outlets";
import { categoryName } from "@/lib/taxonomy";
import { cveBadges } from "@/lib/cveintel";

export const revalidate = 180;

type Params = { slug: string };

function tfKindOf(t: IocType): TfKind | null {
  if (t === "ipv4") return "ip";
  if (t === "domain") return "domain";
  if (t === "url") return "url";
  if (t === "sha256" || t === "sha1" || t === "md5") return "hash";
  return null;
}

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

export default async function StoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const [recent, badges] = await Promise.all([
    getStories(60).catch(() => []),
    cveBadges(story.cveIds).catch(() => new Map()),
  ]);

  const { time, date } = formatStoryDate(story.publishedAt);
  const host = outletHost(story.sourceUrl);
  const code = outletCode(story.sourceUrl);

  // Threat intelligence derived from THIS story: indicators lifted from its text
  // (genuinely tied to this news), the actor(s) it names, and — only when it names
  // a SPECIFIC malware family/actor — that named threat's live infrastructure.
  const iocText = [story.titleAz, story.titleEn, story.bodyAz];
  const extracted = extractIocs(...iocText);
  const actors = detectActors(...iocText);
  const pivots = specificPivots(...iocText);

  // Enrich the story's OWN indicators: cross-check each against the live ThreatFox
  // feed so a defender learns which of this article's IOCs are known-malicious and
  // behind what family — enrichment tied to the news, not a generic category dump.
  const repChecks = await Promise.all(
    extracted.map(async (i) => {
      const k = tfKindOf(i.type);
      if (!k) return null;
      const hits = await lookupThreatFox(i.value, k).catch(() => []);
      return hits.length
        ? {
            key: `${i.type}:${i.value.toLowerCase()}`,
            rep: { malware: hits[0].malware, threatType: hits[0].threatType, confidence: hits[0].confidence },
          }
        : null;
    })
  );
  const repMap = new Map(repChecks.filter((x): x is NonNullable<typeof x> => x !== null).map((x) => [x.key, x.rep]));
  const enrichedExtracted = extracted.map((i) => ({
    ...i,
    rep: repMap.get(`${i.type}:${i.value.toLowerCase()}`) ?? null,
  }));
  const hasIntel = extracted.length > 0 || actors.length > 0 || pivots.length > 0;

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
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="mx-auto w-full max-w-[42rem] flex-1 px-[var(--sp-gutter)] py-[var(--sp-section)]">
        <Link
          href="/"
          className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-ink-primary"
        >
          ← lent
        </Link>

        {/* telemetry */}
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[length:var(--t-meta)] text-ink-muted">
          <time dateTime={story.publishedAt} className="tabular-nums">
            {date} · {time}
          </time>
          <span className="flex items-center gap-1.5">
            <GlyphChip category={story.category} />
            <span className="uppercase tracking-[0.06em]">{categoryName(story.category)}</span>
          </span>
          <FlagChips kev={story.kev} cveIds={story.cveIds} region={story.region} />
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={host}
            className="ml-auto transition-colors hover:text-brand"
          >
            mənbə · {code} ↗
          </a>
        </div>

        <h1 className="mt-4 font-headline text-[length:var(--t-display)] font-semibold leading-[1.05] tracking-[-0.01em] text-ink-primary">
          {story.titleAz}
        </h1>

        {/* mini-Spektr — situates this briefing in the live threat spectrum */}
        {recent.length > 0 && (
          <div className="mt-5">
            <SpektrStrip
              stories={recent}
              variant="mini"
              ownCategory={story.category}
              caption="son 60 dispaç üzrə spektr"
            />
          </div>
        )}

        <div className="mt-6 h-px w-full bg-hairline" />

        <p className="mt-7 whitespace-pre-line text-[length:var(--t-body)] leading-[1.75] text-ink-secondary">
          {story.bodyAz}
        </p>

        {/* CVE small-info block — cross-links into the registry */}
        {story.cveIds.length > 0 && (
          <div className="mt-8 border-t border-hairline pt-6">
            <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted">
              CVE · təfərrüat
            </div>
            <ul className="mt-3 flex flex-col gap-2.5">
              {story.cveIds.map((cve) => {
                const b = badges.get(cve.toUpperCase());
                const epssPct = b?.epss != null ? b.epss * 100 : null;
                return (
                  <li key={cve} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={`/cve#${cve.toUpperCase()}`}
                      className="font-mono text-[length:var(--t-meta)] text-ink-primary transition-colors hover:text-brand"
                    >
                      {cve}
                    </Link>
                    {b?.kev && (
                      <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-mono text-[length:var(--t-micro)] font-semibold uppercase text-surface">
                        KEV
                      </span>
                    )}
                    {epssPct != null && (
                      <span className="rounded-[var(--radius-chip)] border border-ink-secondary px-1 py-px font-mono text-[length:var(--t-micro)] text-ink-secondary">
                        EPSS {epssPct.toFixed(epssPct < 1 ? 2 : 0)}%
                      </span>
                    )}
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-ink-muted transition-colors hover:text-brand"
                    >
                      NVD ↗
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* attribution footer */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline pt-5 font-mono text-[length:var(--t-meta)] text-ink-muted">
          <span className="text-accent-good">əsaslandırılıb ✓</span>
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={host}
            className="uppercase tracking-wider transition-colors hover:text-ink-primary"
          >
            ilkin mənbə ↗
          </a>
        </div>

        {/* threat-intelligence inset — actor dossier + indicators (extracted + live) */}
        {hasIntel && (
          <section className="darkroom mt-10 border border-hairline bg-surface p-5 sm:p-6">
            {actors.length > 0 && (
              <>
                <ThreatActorCard actors={actors} />
                <div className="my-6 h-px w-full bg-hairline" />
              </>
            )}
            <IocPanel extracted={enrichedExtracted} pivots={pivots} />
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
