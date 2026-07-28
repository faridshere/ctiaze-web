import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StoryRow } from "@/components/StoryRow";
import { StoryLink } from "@/components/StoryLink";
import { LiveUpdateBanner } from "@/components/LiveUpdateBanner";
import { SeverityMarker } from "@/components/SeverityMarker";
import { formatStoryDate } from "@/lib/format";
import { getStories, getStats } from "@/lib/stories";
import { getLatestSnapshot } from "@/lib/exposure";
import type { Story } from "@/lib/types";

export const revalidate = 180;

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "mənbə";
  }
}

function compact(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export default async function HomePage() {
  const [stories, stats, snapshot] = await Promise.all([
    getStories(60),
    getStats(),
    getLatestSnapshot().catch(() => null),
  ]);
  const [lead, ...rest] = stories;
  const digest = rest.slice(0, 5);
  const feed = rest.slice(5);

  const now = Date.now();
  const last24 = stories.filter(
    (s) => now - new Date(s.publishedAt).getTime() < 86_400_000
  ).length;
  const azHosts = snapshot?.total_hosts ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <LiveUpdateBanner initialCount={stats.total} />

      {/* Signal bar — four hard numbers, no boxes */}
      <div className="border-b border-hairline">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4">
          <dl className="flex items-center gap-x-7 whitespace-nowrap py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <Sig k="24 saat" v={`${last24} xəbər`} />
            <Sig k="kev" v={String(stats.kevCount)} hot={stats.kevCount > 0} />
            {azHosts > 0 && <Sig k="AZ açıq host" v={compact(azHosts)} />}
            <Sig k="mənbə" v="50+" />
            <Sig k="arxiv" v={String(stats.total)} />
          </dl>
        </div>
      </div>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4">
        {stories.length === 0 ? (
          <p className="py-16 text-center text-ink-muted font-mono text-sm">
            hələ heç bir xəbər dərc olunmayıb
          </p>
        ) : (
          <>
            {/* Lead + digest */}
            <section className="grid grid-cols-1 gap-x-12 gap-y-10 pt-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <LeadStory story={lead} />
              <DigestCard stories={digest} />
            </section>

            {/* Feed */}
            {feed.length > 0 && (
              <section className="mt-12 border-t border-hairline pt-2">
                <h2 className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                  Son xəbərlər
                </h2>
                <div className="mt-2">
                  {feed.map((story) => (
                    <StoryRow key={story.id} story={story} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Instrument teaser — a window from daylight into the darkroom */}
      {azHosts > 0 && (
        <div className="ops mt-16">
          <Link
            href="/exposure"
            className="group block border-y border-hairline bg-surface"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
                  Alət · Exposure
                </div>
                <div className="mt-1.5 font-headline text-2xl font-semibold text-ink-primary">
                  Azərbaycanda{" "}
                  <span className="tabular-nums">{azHosts.toLocaleString("en-US")}</span>{" "}
                  açıq host
                </div>
                <p className="mt-1 text-sm text-ink-secondary">
                  İnternetə açıq attack surface, SOC izləmə siyahısı və canlı IP yoxlaması.
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm text-brand transition-transform group-hover:translate-x-1">
                Alətə keç →
              </span>
            </div>
          </Link>
        </div>
      )}

      <Footer />
    </div>
  );
}

function Sig({ k, v, hot = false }: { k: string; v: string; hot?: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <dt>{k}</dt>
      <dd className={`tabular-nums ${hot ? "text-accent-critical" : "text-ink-primary"}`}>{v}</dd>
    </div>
  );
}

function LeadStory({ story }: { story: Story }) {
  const { time, date } = formatStoryDate(story.publishedAt);
  const flagged = story.kev || story.severity === "critical";

  return (
    <StoryLink slug={story.slug} title={story.titleAz} className="group block">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-muted">
        {flagged ? (
          <SeverityMarker kev={story.kev} severity={story.severity} />
        ) : (
          <span className="uppercase tracking-wider text-brand">{story.category}</span>
        )}
        <time dateTime={story.publishedAt} title={`${date} · ${time} (Baku)`}>
          {date} · {time}
        </time>
        {story.region && <span className="text-ink-secondary">AZ</span>}
        {story.cveIds[0] && <span>{story.cveIds[0]}</span>}
      </div>

      <h1 className="font-headline text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink-primary sm:text-[2.6rem]">
        {story.titleAz}
      </h1>

      {story.bodyAz && (
        <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-ink-secondary sm:text-[1.15rem]">
          {story.bodyAz}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 font-mono text-[11px] text-ink-muted">
        <span className="text-accent-good">əsaslandırılıb ✓</span>
        <span className="text-ink-muted/50">·</span>
        <span>mənbə: {sourceHost(story.sourceUrl)}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-brand opacity-0 transition-opacity group-hover:opacity-100">
          tam oxu →
        </span>
      </div>
    </StoryLink>
  );
}

function DigestCard({ stories }: { stories: Story[] }) {
  if (stories.length === 0) return null;
  return (
    <aside className="rounded-lg border border-hairline bg-brand-wash p-5 h-fit">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">Bu gün</h2>
      <ul className="mt-4 divide-y divide-hairline">
        {stories.map((s) => {
          const { time } = formatStoryDate(s.publishedAt);
          return (
            <li key={s.id} className="py-2.5 first:pt-0 last:pb-0">
              <StoryLink slug={s.slug} title={s.titleAz} className="group flex gap-3">
                <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-ink-muted">
                  {time}
                </span>
                <span className="text-[13.5px] leading-snug text-ink-primary group-hover:text-brand">
                  {s.titleAz}
                </span>
              </StoryLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
