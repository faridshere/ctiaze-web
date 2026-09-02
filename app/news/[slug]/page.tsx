import { Suspense } from "react";
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
import { formatStoryDate, jsonLdSafe } from "@/lib/format";
import { urgencyHeader, exposureLine, storyActions, epssBadge } from "@/lib/storysignal";
import { getStoryBySlug, getStories } from "@/lib/stories";
import { extractIocs, type IocType } from "@/lib/ioc";
import { detectActors, specificPivots } from "@/lib/actors";
import { lookupThreatFox, iocsByMalware, type TfKind } from "@/lib/threatfox";
import { outletCode, outletHost } from "@/lib/outlets";
import { categoryName } from "@/lib/taxonomy";
import { cveBadges } from "@/lib/cveintel";
import { getLocale } from "@/lib/i18n-server";

export const revalidate = 86400; // a published dispatch never changes; this was 180s,
// i.e. up to 480 regenerations/day across every article — the top ISR-write burner.
export const dynamicParams = true;
// Render on demand and cache (ISR) rather than as a per-request function — there
// are too many of these to prerender at build, but caching them keeps crawler
// traffic off Fluid Active CPU.
export async function generateStaticParams() {
  return [];
}

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
  // A missing slug is a real 404, not a 200 soft-404: returning a "Not found" title
  // lets the streamed shell commit a 200 (crawlers then treat every stale sitemap/RSS
  // link as a live page). notFound() here yields a genuine 404 status. getStoryBySlug
  // is cache()-wrapped, so the page body's identical call adds no extra Mongo read.
  if (!story) notFound();
  const en = (await getLocale()) === "en";
  const title = en ? story.titleEn : story.titleAz;
  const desc = (story.summaryEn || story.titleEn || story.titleAz).slice(0, 160);
  const url = `https://skopnix.com/news/${story.slug}`;
  // Each ?dil= variant must be SELF-canonical, or Google dedupes the alternate into
  // the bare URL's canonical and ignores the hreflang cluster — so the Azerbaijani
  // long-tail never gets its own indexable URL. Bare URL keeps the bare canonical +
  // x-default; a forced ?dil=az|en canonicalizes to itself. Junk ?dil values fall
  // back to the bare canonical so they can't mint duplicates.
  const canonical = url;
  return {
    title,
    description: desc,
    // Crawlable in both languages so the Azerbaijani per-CVE long-tail gets indexed
    // (Googlebot is cookieless → would otherwise only ever see the English render).
    alternates: { canonical },
    openGraph: { title, description: desc, url: canonical, type: "article", publishedTime: story.publishedAt },
  };
}

export default async function StoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const en = (await getLocale()) === "en";
  const loc = en ? "en" : "az";
  const dTitle = en ? story.titleEn : story.titleAz;
  const dBody = en ? story.summaryEn || story.bodyAz : story.bodyAz;

  const [recent, badges] = await Promise.all([
    getStories(60).catch(() => []),
    cveBadges(story.cveIds).catch(() => new Map()),
  ]);

  const { time, date } = formatStoryDate(story.publishedAt, en ? "en" : "az");
  const urgency = urgencyHeader(story, loc);
  const exposure = exposureLine(story, loc);
  const actions = storyActions(story, loc);
  const host = outletHost(story.sourceUrl);
  const code = outletCode(story.sourceUrl);
  // Self-generated stories (e.g. the weekly exposure digest) carry no external
  // source URL. Rendering the "source ↗" anchor for them produces a dead click
  // (href absent) with a meaningless "SRC" code — so gate every source link on a
  // real http(s) URL.
  const hasSource = /^https?:\/\//i.test(story.sourceUrl || "");

  // Threat intelligence derived from THIS story: indicators lifted from its text
  // (genuinely tied to this news), the actor(s) it names, and — only when it names
  // a SPECIFIC malware family/actor — that named threat's live infrastructure.
  // Extraction is cheap local regex; the ThreatFox lookups live in <IntelInset>
  // behind Suspense (below) so a cold abuse.ch index (~15s) can never block the
  // article text — the story streams first, the intel fills in.
  const iocText = [story.titleAz, story.titleEn, story.bodyAz];
  const extracted = extractIocs(...iocText);
  const actors = detectActors(...iocText);
  const pivots = specificPivots(...iocText);
  const maybeIntel = extracted.length > 0 || actors.length > 0 || pivots.length > 0;

  const storyUrl = `https://skopnix.com/news/${story.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: dTitle,
    url: storyUrl,
    image: [`${storyUrl}/opengraph-image`],
    datePublished: story.publishedAt,
    dateModified: story.publishedAt,
    inLanguage: loc,
    author: { "@type": "Organization", name: "Hackxana" },
    publisher: { "@type": "Organization", name: "skopnix" },
    mainEntityOfPage: storyUrl,
    ...((story.summaryEn || story.titleEn) ? { description: (story.summaryEn || story.titleEn).slice(0, 200) } : {}),
    ...(story.cveIds.length
      ? { about: story.cveIds.map((c) => ({ "@type": "Thing", name: c })) }
      : {}),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
      />
      <Header />
      <main id="main" className="mx-auto w-full max-w-[42rem] flex-1 px-[var(--sp-gutter)] py-[var(--sp-section)]">
        <Link
          href="/"
          className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-ink-primary"
        >
          {en ? "← feed" : "← lent"}
        </Link>

        {/* telemetry */}
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[length:var(--t-meta)] text-ink-muted">
          <time dateTime={story.publishedAt} className="tabular-nums">
            {date} · {time}
          </time>
          <span className="flex items-center gap-1.5">
            <GlyphChip category={story.category} />
            <span className="uppercase tracking-[0.06em]">{categoryName(story.category, loc)}</span>
          </span>
          <FlagChips kev={story.kev} cveIds={story.cveIds} region={story.region} epssLabel={epssBadge(story)} />
          {hasSource && (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={host}
              className="ml-auto transition-colors hover:text-brand"
            >
              {en ? "source" : "mənbə"} · {code} ↗
            </a>
          )}
        </div>

        <h1 className="mt-4 font-headline text-[length:var(--t-display)] font-semibold leading-[1.05] tracking-[-0.01em] text-ink-primary">
          {dTitle}
        </h1>

        {/* Web parity with the Telegram post: deterministic urgency + exposure +
            "what to do", all pure functions of pipeline-stamped fields. */}
        {urgency && (
          <div
            role="status"
            className={`mt-5 flex items-center gap-2 rounded-md border px-3.5 py-2.5 ${urgency.tone === "critical" ? "border-accent-critical/40 bg-accent-critical/10" : "border-accent-warning/40 bg-accent-warning/10"}`}
          >
            <span aria-hidden="true">{urgency.tone === "critical" ? "🔴" : "🟠"}</span>
            <span className={`font-mono text-[13px] font-semibold ${urgency.tone === "critical" ? "text-accent-critical" : "text-accent-warning"}`}>
              {urgency.text}
            </span>
          </div>
        )}
        {exposure && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-brand/30 bg-brand-wash px-3.5 py-2.5 font-mono text-[12.5px] leading-snug text-brand">
            <span aria-hidden="true">🛰️</span>
            <span>{exposure}</span>
          </div>
        )}
        {actions.length > 0 && (
          <div className="mt-3 rounded-md border border-hairline bg-surface-raised/40 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              {en ? "What to do" : "Nə etməli"}
            </div>
            <ul className="mt-2 space-y-1.5">
              {actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-secondary">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* mini-Spektr — situates this briefing in the live threat spectrum */}
        {recent.length > 0 && (
          <div className="mt-5">
            <SpektrStrip
              stories={recent}
              variant="mini"
              ownCategory={story.category}
              caption={en ? "last 60 dispatches · spectrum" : "son 60 dispaç üzrə spektr"}
            />
          </div>
        )}

        <div className="mt-6 h-px w-full bg-hairline" />

        <p className="mt-7 whitespace-pre-line text-[length:var(--t-body)] leading-[1.75] text-ink-secondary">
          {dBody}
        </p>

        {/* CVE small-info block — cross-links into the registry */}
        {story.cveIds.length > 0 && (
          <div className="mt-8 border-t border-hairline pt-6">
            <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted">
              {en ? "CVE · detail" : "CVE · təfərrüat"}
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

        {/* sources — the reader chooses which outlet to read (Ground-News-style) */}
        {story.altSources.length > 0 && (
          <div className="mt-8 border-t border-hairline pt-5">
            <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted">
              {en ? "Sources" : "Mənbələr"} · {story.altSources.length + (hasSource ? 1 : 0)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[length:var(--t-meta)]">
              {hasSource && (
                <a
                  href={story.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={host}
                  className="text-ink-primary transition-colors hover:text-brand"
                >
                  {code} · {en ? "primary" : "ilkin"} ↗
                </a>
              )}
              {story.altSources.map((u) => (
                <a
                  key={u}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={outletHost(u)}
                  className="text-ink-secondary transition-colors hover:text-brand"
                >
                  {outletCode(u)} ↗
                </a>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[length:var(--t-micro)] text-ink-muted">
              {en ? "outlets reporting the same story — pick one to read" : "eyni hadisəni bildirən mənbələr — oxumaq üçün birini seçin"}
            </p>
          </div>
        )}

        {/* attribution footer */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline pt-5 font-mono text-[length:var(--t-meta)] text-ink-muted">
          <span className="text-accent-good">{en ? "grounded ✓" : "əsaslandırılıb ✓"}</span>
          {hasSource && (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={host}
              className="uppercase tracking-wider transition-colors hover:text-ink-primary"
            >
              {en ? "primary source" : "ilkin mənbə"} ↗
            </a>
          )}
        </div>

        {/* threat-intelligence inset — actor dossier + indicators (extracted + live).
            Streamed behind Suspense: the ThreatFox lookups inside can take seconds
            on a cold index, and the article must never wait on them. */}
        {maybeIntel && (
          <Suspense fallback={<IntelFallback en={en} />}>
            <IntelInset extracted={extracted} actors={actors} pivots={pivots} />
          </Suspense>
        )}

        {/* Related stories — precomputed semantic neighbours (ops/embed_related.py).
            Real internal links: keeps readers on-site and feeds crawlers a dense
            topic graph. No live inference, no extra query. */}
        {story.related.length > 0 && (
          <nav aria-label={en ? "Related stories" : "Oxşar xəbərlər"} className="mt-10 border-t border-hairline pt-6">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
              {en ? "Related" : "Oxşar xəbərlər"}
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {story.related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/news/${r.slug}`}
                    className="group flex gap-2 text-[14px] leading-snug text-ink-secondary transition-colors hover:text-brand"
                  >
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-brand">→</span>
                    <span className="min-w-0">{en ? r.titleEn : r.titleAz}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}

function IntelFallback({ en }: { en: boolean }) {
  return (
    <section className="darkroom mt-10 border border-hairline bg-surface p-5 sm:p-6" aria-busy="true">
      <p role="status" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        <span className="text-accent-good">●</span> {en ? "loading threat intel…" : "təhdid inteli yüklənir…"}
      </p>
    </section>
  );
}

// Server component so its awaits stream independently of the article body.
async function IntelInset({
  extracted,
  actors,
  pivots,
}: {
  extracted: ReturnType<typeof extractIocs>;
  actors: ReturnType<typeof detectActors>;
  pivots: ReturnType<typeof specificPivots>;
}) {
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

  // The named threat's live infrastructure, from the reliable keyless ThreatFox
  // export filtered by family (server-rendered — no client loading/empty states).
  const familyResult = pivots.length
    ? await iocsByMalware(pivots, 20).catch(() => ({ family: "", hits: [] }))
    : { family: "", hits: [] };
  const familyIocs = familyResult.hits.map((h) => ({
    kind: h.kind,
    ioc: h.ioc,
    malware: h.malware,
    threatType: h.threatType,
    confidence: h.confidence,
    firstSeen: h.firstSeen ?? null,
    reference: h.reference ?? null,
    port: h.port ?? null,
  }));
  const hasIntel = extracted.length > 0 || actors.length > 0 || familyIocs.length > 0;
  if (!hasIntel) return null;

  return (
    <section className="darkroom mt-10 border border-hairline bg-surface p-5 sm:p-6">
      {actors.length > 0 && (
        <>
          <ThreatActorCard actors={actors} />
          <div className="my-6 h-px w-full bg-hairline" />
        </>
      )}
      <IocPanel extracted={enrichedExtracted} familyName={familyResult.family} familyIocs={familyIocs} />
    </section>
  );
}
