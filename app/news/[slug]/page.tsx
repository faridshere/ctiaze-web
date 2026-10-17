import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CtaBand } from "@/components/site/CtaBand";
import { StoryHead } from "@/components/story/StoryHead";
import { StorySignals } from "@/components/story/StorySignals";
import { StoryBody } from "@/components/story/StoryBody";
import { StoryCves } from "@/components/story/StoryCves";
import { StorySources } from "@/components/story/StorySources";
import { StoryRelated } from "@/components/story/StoryRelated";
import { IntelInset, IntelFallback, validIndicators } from "@/components/story/IntelInset";
import { StoryFacts } from "@/components/story/StoryFacts";
import { jsonLdSafe } from "@/lib/format";
import { getStoryBySlug, getStats } from "@/lib/stories";
import { extractIocs } from "@/lib/ioc";
import { detectActors, specificPivots } from "@/lib/actors";
import { outletCode, outletHost } from "@/lib/outlets";
import { cveBadges, kevMeta, type KevRow } from "@/lib/cveintel";
import { SITE_NAME, SITE_URL, storyUrl } from "@/lib/site";

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

// The edition number for the colophon, so a dispatch carries the same footer
// as the archive. One cached count shared by every story page for an hour,
// not a count per story render.
const getTotal = unstable_cache(async () => (await getStats()).total, ["news-total-v1"], { revalidate: 3600 });

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
  const title = story.titleEn;
  const desc = (story.summaryEn || story.titleEn).slice(0, 160);
  const url = storyUrl(story.slug);
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, type: "article", publishedTime: story.publishedAt },
  };
}

export default async function StoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  // Only the first 12 chars of a slug address the story, so every link shared
  // before permalinks switched from Azerbaijani to English still resolves, and
  // so does any made-up tail. Each of those URLs rendered as its own 200 page,
  // and on the self-hosted box every one became ISR files on disk (2026-09-24,
  // review: 20 junk tails wrote 140 files). One 308 to the canonical slug keeps
  // the old links working; lib/isr-cache-handler.mjs keeps redirect renders in
  // memory, so only canonical pages reach the disk. This used to degrade to a
  // soft client-side hop because app/loading.tsx put the route behind Suspense
  // (verified 2026-09-07); that file is gone, and a route of this shape on
  // next 16.3.6 now answers 308 with a Location header (checked 2026-09-24).
  if (slug !== story.slug) permanentRedirect(`/news/${story.slug}`);

  // KEV dates for the data box come from the same in-memory CISA catalogue
  // cveBadges reads (one download, cached 24h in lib/cveintel): no extra
  // network round-trip, and nothing per request against the database.
  const [total, badges, kevRows] = await Promise.all([
    getTotal().catch(() => null),
    cveBadges(story.cveIds).catch(() => new Map()),
    story.cveIds.length ? kevMeta().catch(() => new Map<string, KevRow>()) : Promise.resolve(new Map<string, KevRow>()),
  ]);

  const host = outletHost(story.sourceUrl);
  const code = outletCode(story.sourceUrl);
  // Self-generated stories (e.g. the weekly exposure digest) carry no external
  // source URL. Rendering a "source ↗" anchor for them produces a dead click
  // (href absent) with a meaningless code — so gate every source link on a real
  // http(s) URL.
  const hasSource = /^https?:\/\//i.test(story.sourceUrl || "");

  // Threat intelligence derived from THIS story: indicators lifted from its text
  // (genuinely tied to this news), the actor(s) it names, and — only when it names
  // a SPECIFIC malware family/actor — that named threat's live infrastructure.
  // Extraction is cheap local regex; the ThreatFox lookups live in <IntelInset>
  // behind Suspense (below) so a cold abuse.ch index (~15s) can never block the
  // article text — the story streams first, the intel fills in.
  const iocText = [story.titleAz, story.titleEn, story.bodyAz];
  // Only names with a real top-level domain count: a config key the summary
  // quotes ("cors.origins") must never print as an indicator.
  const extracted = validIndicators(extractIocs(...iocText));
  const actors = detectActors(...iocText);
  const pivots = specificPivots(...iocText);
  const maybeIntel = extracted.length > 0 || actors.length > 0 || pivots.length > 0;

  const url = storyUrl(story.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.titleEn,
    url,
    image: [`${url}/opengraph-image`],
    datePublished: story.publishedAt,
    dateModified: story.publishedAt,
    inLanguage: "en",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` } },
    mainEntityOfPage: url,
    ...(story.summaryEn ? { description: story.summaryEn.slice(0, 200) } : {}),
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
      <SiteHeader section="Section C · The archive · Dispatch" />
      <main id="main" className="flex-1">
        <StoryHead story={story} hasSource={hasSource} host={host} code={code} />

        {/* The story page as a broadsheet: the deck and every ruled section in
            columns 1-8, the data box ("Facts on file") in 9-12 behind a column
            rule on a desk. On a phone the grid collapses to one column and the
            same box prints once, under the deck, before the signals: explicit
            grid placement, not a second render. The column opens with words
            (the deck, then the signals); the wire-wide category spectrum that
            used to sit between them described the whole wire, not this
            dispatch, and was removed. */}
        <div className="sheet pb-[var(--sp-section)]">
          <div className="grid gap-x-[var(--col-gap)] md:grid-cols-12">
            <div className="md:col-span-8">
              <StoryBody story={story} kevRows={kevRows} hasSource={hasSource} host={host} />
            </div>
            <aside className="mt-8 md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1 md:mt-6 md:border-l md:border-rule-soft md:pl-6">
              <div className="md:sticky md:top-[92px]">
                <StoryFacts story={story} kevRows={kevRows} />
              </div>
            </aside>
            <div className="min-w-0 md:col-span-8 md:col-start-1 md:row-start-2">
              <StorySignals story={story} />
              <StoryCves cveIds={story.cveIds} badges={badges} />
              <StorySources story={story} hasSource={hasSource} host={host} code={code} />

              {/* threat-intelligence inset — actor dossier + indicators (extracted + live).
                  Streamed behind Suspense: the ThreatFox lookups inside can take seconds
                  on a cold index, and the article must never wait on them. */}
              {maybeIntel && (
                <Suspense fallback={<IntelFallback />}>
                  <IntelInset extracted={extracted} actors={actors} pivots={pivots} />
                </Suspense>
              )}

              {/* Related stories — precomputed semantic neighbours (ops/embed_related.py).
                  Real internal links: keeps readers on-site and feeds crawlers a dense
                  topic graph. No live inference, no extra query. */}
              <StoryRelated related={story.related} />
            </div>
          </div>
        </div>

        <CtaBand
          source="story:inline"
          heading="Get the next one first."
          blurb="Every dispatch goes to Telegram and RSS the moment it is published, and the whole wire is a keyless JSON API."
        />
      </main>
      <SiteFooter total={total} />
    </div>
  );
}
