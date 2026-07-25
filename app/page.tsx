import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StoryRow } from "@/components/StoryRow";
import { Ticker } from "@/components/Ticker";
import { StatsAside } from "@/components/StatsAside";
import { SeverityMarker } from "@/components/SeverityMarker";
import { formatStoryDate } from "@/lib/format";
import { getStories, getStats } from "@/lib/stories";
import type { Story } from "@/lib/types";

// The pipeline publishes at most every ~15 minutes; a few minutes of staleness
// here is imperceptible in practice, and this keeps the data layer as simple
// as possible (no webhook/on-demand-revalidation plumbing needed for v1).
export const revalidate = 180;

export default async function HomePage() {
  const [stories, stats] = await Promise.all([getStories(60), getStats()]);
  const [lead, ...rest] = stories;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Ticker headlines={stories.slice(0, 10).map((s) => s.titleAz)} />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4">
        {stories.length === 0 ? (
          <p className="py-16 text-center text-ink-muted font-mono text-sm">
            hələ heç bir xəbər dərc olunmayıb
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-x-12">
            <div className="min-w-0">
              <LeadStory story={lead} />
              <div className="mt-2">
                {rest.map((story, i) => (
                  <StoryRow key={story.id} story={story} index={i + 2} />
                ))}
              </div>
            </div>
            <div className="lg:border-l lg:border-hairline lg:pl-8 pt-10 lg:pt-8 border-t lg:border-t-0 border-hairline mt-8 lg:mt-0">
              <StatsAside stories={stories} total={stats.total} kevCount={stats.kevCount} />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function LeadStory({ story }: { story: Story }) {
  const { time, date } = formatStoryDate(story.publishedAt);

  return (
    <Link
      href={`/xeber/${story.slug}`}
      className="group block pt-8 pb-8 border-b-[3px] border-ink-primary"
    >
      <div className="flex items-baseline gap-3 font-mono text-[11px] text-ink-muted mb-3">
        <span className="text-ink-muted/50">01</span>
        <time dateTime={story.publishedAt} title={`${date} · ${time} (Baku)`}>
          {time}
        </time>
        <SeverityMarker kev={story.kev} severity={story.severity} />
        <span className="uppercase tracking-wider">{story.category}</span>
        {story.region && <span className="text-ink-secondary">AZ</span>}
        {story.cveIds[0] && <span>{story.cveIds[0]}</span>}
      </div>

      <h1 className="font-headline text-[1.9rem] sm:text-4xl leading-[1.1] text-ink-primary group-hover:opacity-70 transition-opacity">
        {story.titleAz}
      </h1>

      {story.bodyAz && (
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-secondary max-w-2xl">
          {story.bodyAz}
        </p>
      )}
    </Link>
  );
}
