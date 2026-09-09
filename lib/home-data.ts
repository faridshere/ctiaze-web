import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { PUBLISHED_FILTER } from "./stories";
import { toStory, type StoryDoc } from "./types";
import { selectWire } from "./wire-select";

// Everything the landing page shows, as ONE JSON-safe blob behind Next's data
// cache. The page is hourly ISR, so this runs at most once an hour and the
// visitor never waits on Mongo. Every number here is a real count over the same
// published-story gate the pipeline uses before anything reaches Telegram.
export type WireRow = {
  slug: string;
  title: string;
  category: string;
  severity: string | null;
  kev: boolean;
  at: string; // ISO
};

export type HomeData = {
  wire: WireRow[];
  week: { dispatches: number; kev: number; cves: number; sources: number };
  /** last 14 days, oldest first, zero-filled — for the sparkline */
  daily: { day: string; n: number }[];
  total: number;
  latestAt: string | null;
  generatedAt: string; // ISO — when this blob was computed
};

const DAY = 86_400_000;
const WIRE_ROWS = 7;
// How many of those rows one source may hold. GitHub's advisory feed publishes
// in bursts — 20 GHSA entries inside four minutes on the evening of 08 Sep — and
// since the wire is ordered by when the news happened, a burst like that took
// five of the seven rows above the fold, pushing a Chrome zero-day and a KEV
// addition down the page. Nothing is dropped or hidden: an item that loses its
// slot is one scroll away in /news, which stays a complete ledger.
const WIRE_MAX_PER_SOURCE = 2;
// Read deeper than we display so the cap has alternatives to promote.
const WIRE_CANDIDATES = 40;
const DAILY_DAYS = 14;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function computeHomeData(): Promise<HomeData> {
  const db = await getDb();
  const col = db.collection<StoryDoc>("items");
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since14 = new Date(now.getTime() - DAILY_DAYS * DAY);
  // Deliberate split. The WIRE sorts and shows `effective_at` — when the news
  // happened. The activity counters below ("N dispatches this week", the 14-day
  // sparkline) stay on `published_at`, because they measure OUR publishing rate,
  // not the news: a story that broke three weeks ago and went out today is one
  // dispatch this week, and counting it by its source date would quietly under-
  // report the channel's own output.
  const weekFilter = { ...PUBLISHED_FILTER, published_at: { $gte: since7 } };

  const [docs, total, dispatches, kev, cves, sources, dailyRaw, newestDispatch] = await Promise.all([
    col.find(PUBLISHED_FILTER).sort({ effective_at: -1 }).limit(WIRE_CANDIDATES)
      .project<StoryDoc>({ _id: 1, title: 1, az_title: 1, url: 1, source: 1, ai_category: 1, severity: 1, kev: 1, published_at: 1, effective_at: 1 })
      .toArray(),
    col.countDocuments(PUBLISHED_FILTER),
    col.countDocuments(weekFilter),
    col.countDocuments({ ...weekFilter, kev: true }),
    col.countDocuments({ ...weekFilter, "cve_ids.0": { $exists: true } }),
    col.distinct("source", weekFilter),
    col
      .aggregate<{ _id: string; n: number }>([
        { $match: { ...PUBLISHED_FILTER, published_at: { $gte: since14 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$published_at" } }, n: { $sum: 1 } } },
      ])
      .toArray(),
    // "last dispatch N ago" is a claim about the CHANNEL, so it reads the newest
    // published_at directly. It used to be wire[0].at, which was the same thing
    // only while the wire was also sorted by published_at — now that the wire is
    // ordered by when the news happened, its top row is no longer the most
    // recently dispatched story.
    col.find(PUBLISHED_FILTER).sort({ published_at: -1 }).limit(1)
      .project<StoryDoc>({ _id: 1, published_at: 1 })
      .toArray(),
  ]);

  const byDay = new Map(dailyRaw.map((r) => [r._id, r.n]));
  const daily = Array.from({ length: DAILY_DAYS }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (DAILY_DAYS - 1 - i) * DAY));
    return { day, n: byDay.get(day) ?? 0 };
  });

  // Newest-first, then thinned so no single source owns the panel (lib/wire-select).
  const wire: WireRow[] = selectWire(
    docs.map((doc) => ({ ...toStory(doc), source: doc.source })),
    WIRE_ROWS,
    WIRE_MAX_PER_SOURCE
  ).map((s) => ({
    slug: s.slug,
    title: s.titleEn || s.titleAz,
    category: s.category,
    severity: s.severity,
    kev: s.kev,
    at: s.publishedAt,
  }));

  return {
    wire,
    week: { dispatches, kev, cves, sources: sources.length },
    daily,
    total,
    latestAt: newestDispatch[0]?.published_at
      ? new Date(newestDispatch[0].published_at).toISOString()
      : null,
    generatedAt: now.toISOString(),
  };
}

export const getHomeData = unstable_cache(computeHomeData, ["home-data-v7"], { revalidate: 3600 });

// The landing page must render even if Mongo is unreachable — an empty wire is
// a quiet page, a thrown error is a dead landing page.
export const EMPTY_HOME_DATA: HomeData = {
  wire: [],
  week: { dispatches: 0, kev: 0, cves: 0, sources: 0 },
  daily: [],
  total: 0,
  latestAt: null,
  generatedAt: new Date(0).toISOString(),
};
