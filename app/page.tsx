import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StoryRow } from "@/components/StoryRow";
import { StoryLink } from "@/components/StoryLink";
import { Ticker } from "@/components/Ticker";
import { DispatchBar } from "@/components/DispatchBar";
import { LiveUpdateBanner } from "@/components/LiveUpdateBanner";
import { StatsAside } from "@/components/StatsAside";
import { SeverityMarker } from "@/components/SeverityMarker";
import { formatStoryDate } from "@/lib/format";
import { getStories, getStats } from "@/lib/stories";
import type { Story } from "@/lib/types";

// The pipeline publishes on a ~3h cadence; a few minutes of staleness here is
// imperceptible, and ISR revalidation keeps the data layer simple — no webhook
// needed. A story reaches Mongo (and Telegram) and this page picks it up on the
// next revalidation, with the live banner offering an instant on-demand refresh.
export const revalidate = 180;

export default async function HomePage() {
  const [stories, stats] = await Promise.all([getStories(60), getStats()]);
  const [lead, ...rest] = stories;
  const lastDispatchIso = lead?.publishedAt ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <DispatchBar total={stats.total} kev={stats.kevCount} lastDispatchIso={lastDispatchIso} />
      <Ticker headlines={stories.slice(0, 10).map((s) => s.titleAz)} />
      <LiveUpdateBanner initialCount={stats.total} />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4">
        {stories.length === 0 ? (
          <p className="py-16 text-center text-ink-muted font-mono text-sm">
            hələ heç bir xəbər dərc olunmayıb
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_248px] gap-x-14">
            <div className="min-w-0">
              <LeadStory story={lead} />
              <div className="mt-1">
                {rest.map((story, i) => (
                  <StoryRow key={story.id} story={story} index={i + 2} />
                ))}
              </div>
            </div>
            <div className="lg:border-l lg:border-hairline lg:pl-9 pt-10 lg:pt-9 border-t lg:border-t-0 border-hairline mt-8 lg:mt-0">
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
    <StoryLink
      slug={story.slug}
      title={story.titleAz}
      className="group block -mx-4 px-4 pt-9 pb-9 border-b-[3px] border-ink-primary hover:bg-surface-raised/50 transition-colors"
    >
      <div className="flex items-center gap-3 font-mono text-[11px] text-ink-muted mb-3">
        <span className="text-accent-critical/80">◤ lead</span>
        <span className="text-ink-muted/40">/</span>
        <time dateTime={story.publishedAt} title={`${date} · ${time} (Baku)`}>
          {date} · {time}
        </time>
        <SeverityMarker kev={story.kev} severity={story.severity} />
        <span className="uppercase tracking-wider">{story.category}</span>
        {story.region && <span className="text-ink-secondary">AZ</span>}
        {story.cveIds[0] && <span>{story.cveIds[0]}</span>}
      </div>

      <h1 className="font-headline text-[2rem] sm:text-[2.7rem] leading-[1.08] text-ink-primary">
        {story.titleAz}
      </h1>

      {story.bodyAz && (
        <p
          className={`mt-4 text-base sm:text-[1.15rem] leading-relaxed text-ink-secondary max-w-2xl ${
            story.bodyAz.length > 90 ? "drop-cap" : ""
          }`}
        >
          {story.bodyAz}
        </p>
      )}

      <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-muted group-hover:text-ink-primary transition-colors">
        tam oxu <span aria-hidden>→</span>
      </span>
    </StoryLink>
  );
}
