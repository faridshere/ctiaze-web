import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { PUBLISHED_FILTER } from "./stories";
import { toStory, type StoryDoc } from "./types";

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
  const weekFilter = { ...PUBLISHED_FILTER, published_at: { $gte: since7 } };

  const [docs, total, dispatches, kev, cves, sources, dailyRaw] = await Promise.all([
    col.find(PUBLISHED_FILTER).sort({ published_at: -1 }).limit(WIRE_ROWS)
      .project<StoryDoc>({ _id: 1, title: 1, az_title: 1, url: 1, source: 1, ai_category: 1, severity: 1, kev: 1, published_at: 1 })
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
  ]);

  const byDay = new Map(dailyRaw.map((r) => [r._id, r.n]));
  const daily = Array.from({ length: DAILY_DAYS }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (DAILY_DAYS - 1 - i) * DAY));
    return { day, n: byDay.get(day) ?? 0 };
  });

  const wire = docs.map(toStory).map((s) => ({
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
    latestAt: wire[0]?.at ?? null,
    generatedAt: now.toISOString(),
  };
}

export const getHomeData = unstable_cache(computeHomeData, ["home-data-v3"], { revalidate: 3600 });

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
