import { Suspense } from "react";
import { notFound } from "next/navigation";
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
import { IntelInset, IntelFallback } from "@/components/story/IntelInset";
import { jsonLdSafe } from "@/lib/format";
import { epssBadge } from "@/lib/storysignal";
import { getStoryBySlug, getStories } from "@/lib/stories";
import { extractIocs } from "@/lib/ioc";
import { detectActors, specificPivots } from "@/lib/actors";
import { outletCode, outletHost } from "@/lib/outlets";
import { cveBadges } from "@/lib/cveintel";
import { storyUrl } from "@/lib/site";

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

  const [recent, badges] = await Promise.all([
    getStories(60).catch(() => []),
    cveBadges(story.cveIds).catch(() => new Map()),
  ]);

  const host = outletHost(story.sourceUrl);
  const code = outletCode(story.sourceUrl);
  // Self-generated stories (e.g. the weekly exposure digest) carry no external
  // source URL. Rendering a "source ↗" anchor for them produces a dead click
  // (href absent) with a meaningless code — so gate every source link on a real
  // http(s) URL.
  const hasSource = /^https?:\/\//i.test(story.sourceUrl || "");
  const epssLabel = epssBadge(story);

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
    author: { "@type": "Organization", name: "Hackxana" },
    publisher: { "@type": "Organization", name: "skopnix" },
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
      <SiteHeader />
      <main id="main" className="flex-1">
        <StoryHead story={story} epssLabel={epssLabel} hasSource={hasSource} host={host} code={code} />

        <div className="mx-auto w-full max-w-[46rem] px-[var(--sp-gutter)] pb-[var(--sp-section)]">
          <StorySignals story={story} />
          <StoryBody story={story} recent={recent} />
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

        <div className="mt-16">
          <CtaBand
            source="story:inline"
            heading="Get the next one first."
            blurb="Free early access when the API and MCP server open — more tools, deeper data, your own login. One email when it's ready. Nothing else, ever."
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
