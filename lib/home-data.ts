import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { PUBLISHED_FILTER } from "./stories";
import { toStory, type StoryDoc } from "./types";
import { selectWire } from "./wire-select";
import { withSnapshot } from "./snapshot";
import { kevMeta } from "./cveintel";
import { outletCode, outletHost } from "./outlets";

// Everything the front page prints, as ONE JSON-safe blob behind Next's data
// cache. The page is hourly ISR, so this runs at most once an hour and the
// visitor never waits on Mongo. Every number here is a real count over the same
// published-story gate the pipeline uses before anything reaches Telegram.
//
// v4 "Late Edition" (2026-10-16) added what a broadsheet needs that a dashboard
// did not: the LEAD (the newest actively-exploited story with its CISA dates),
// an archive ORDINAL on every row (the edition number is the archive total, so
// row № = where that story sits in the ledger), the last 24 hours as a list of
// instants for the masthead dial, the date of the first dispatch for the
// standfirst, and yesterday's dispatches for the "earlier edition" column.
export type WireRow = {
  slug: string;
  title: string;
  category: string;
  severity: string | null;
  kev: boolean;
  at: string; // ISO, effective_at (when the news happened)
  /** position in the archive, newest = total; the paper's running number */
  ordinal: number;
  cve: string | null;
};

export type LeadStory = WireRow & {
  summary: string;
  cveIds: string[];
  cvss: number | null;
  epss: number | null;
  sourceCode: string;
  sourceHost: string;
  sourceUrl: string;
  /** CISA KEV dates when the lead is in the catalogue; null when not stated */
  kevAdded: string | null;
  kevDue: string | null;
  ransomware: boolean;
};

export type HomeData = {
  wire: WireRow[];
  lead: LeadStory | null;
  week: { dispatches: number; kev: number; cves: number; sources: number };
  /** last 14 days, oldest first, zero-filled — for the sparkline */
  daily: { day: string; n: number }[];
  total: number;
  latestAt: string | null;
  /** when the first dispatch was published — "since" on the standfirst */
  firstAt: string | null;
  /** every dispatch of the last 24 h as an instant, for the masthead dial */
  last24h: { at: string; kev: boolean }[];
  /** the previous day that had dispatches (UTC), newest first */
  yesterday: WireRow[];
  /** that day's ISO date, or null when the archive has no earlier day */
  yesterdayKey: string | null;
  generatedAt: string; // ISO — when this blob was computed
};

const DAY = 86_400_000;
const WIRE_ROWS = 10;
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
const YESTERDAY_ROWS = 8;

const PROJECTION = {
  _id: 1, title: 1, az_title: 1, url: 1, source: 1, ai_category: 1, sev_rank: 1, kev: 1,
  published_at: 1, effective_at: 1, cve_ids: 1, summary: 1, cvss: 1, epss: 1,
} as const;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

type Candidate = ReturnType<typeof toStory> & { source: string; ordinal: number };

function toRow(s: Candidate): WireRow {
  return {
    slug: s.slug,
    title: s.titleEn || s.titleAz,
    category: s.category,
    severity: s.severity,
    kev: s.kev,
    at: s.publishedAt,
    ordinal: s.ordinal,
    cve: s.cveIds[0] ?? null,
  };
}

async function computeHomeData(): Promise<HomeData> {
  const db = await getDb();
  const col = db.collection<StoryDoc>("items");
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since14 = new Date(now.getTime() - DAILY_DAYS * DAY);
  const since24h = new Date(now.getTime() - DAY);
  const todayStart = utcDayStart(now);
  // Deliberate split. The WIRE sorts and shows `effective_at` — when the news
  // happened. The activity counters below ("N dispatches this week", the 14-day
  // sparkline) stay on `published_at`, because they measure OUR publishing rate,
  // not the news: a story that broke three weeks ago and went out today is one
  // dispatch this week, and counting it by its source date would quietly under-
  // report the channel's own output.
  const weekFilter = { ...PUBLISHED_FILTER, published_at: { $gte: since7 } };

  const [docs, total, dispatches, kev, cves, sources, dailyRaw, newestDispatch, firstDispatch, last24hRaw, previousDay] =
    await Promise.all([
      col.find(PUBLISHED_FILTER).sort({ effective_at: -1 }).limit(WIRE_CANDIDATES)
        // sev_rank, not severity: the pipeline only ever writes the rank (see
        // lib/types.ts), so projecting `severity` returned nothing and every
        // non-KEV row got the muted dot however critical it was.
        .project<StoryDoc>(PROJECTION)
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
      col.find({ ...PUBLISHED_FILTER, published_at: { $exists: true } }).sort({ published_at: 1 }).limit(1)
        .project<StoryDoc>({ _id: 1, published_at: 1 })
        .toArray(),
      col.find({ ...PUBLISHED_FILTER, published_at: { $gte: since24h } })
        .project<StoryDoc>({ _id: 1, published_at: 1, kev: 1 })
        .limit(200)
        .toArray(),
      // The newest dispatch before today (UTC) names the day the earlier-edition
      // column prints: yesterday when yesterday had news, the last day that did
      // otherwise, so the column is never an empty box on a quiet Monday.
      col.find({ ...PUBLISHED_FILTER, published_at: { $lt: todayStart } }).sort({ published_at: -1 }).limit(1)
        .project<StoryDoc>({ _id: 1, published_at: 1 })
        .toArray(),
    ]);

  const byDay = new Map(dailyRaw.map((r) => [r._id, r.n]));
  const daily = Array.from({ length: DAILY_DAYS }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (DAILY_DAYS - 1 - i) * DAY));
    return { day, n: byDay.get(day) ?? 0 };
  });

  // Running numbers: the newest story in the archive is № total, the next is
  // № total − 1, and so on down the candidate list (which is the archive order).
  const candidates: Candidate[] = docs.map((doc, i) => ({ ...toStory(doc), source: doc.source, ordinal: total - i }));

  // The lead: the newest story that is actively exploited, else the newest
  // critical one, else simply the newest. It leaves the wire so the front page
  // never prints the same headline twice.
  // A splash wants a headline, not an advisory id list: among the actively
  // exploited candidates the newest with a title under 120 characters leads;
  // only when none qualifies does the newest long one.
  const headline = (c: Candidate) => (c.titleEn || c.titleAz).length <= 120;
  const kevs = candidates.filter((c) => c.kev);
  const criticals = candidates.filter((c) => c.severity === "critical");
  const leadCandidate =
    kevs.find(headline) ?? kevs[0] ?? criticals.find(headline) ?? criticals[0] ?? candidates.find(headline) ?? candidates[0] ?? null;

  let lead: LeadStory | null = null;
  if (leadCandidate) {
    let kevRow: { dateAdded: string | null; dueDate: string | null; ransomware: boolean } | null = null;
    if (leadCandidate.kev && leadCandidate.cveIds.length) {
      // CISA's catalogue is one keyless download, cached for a day; a miss or a
      // timeout prints no dates rather than a guess.
      try {
        const kevMap = await kevMeta();
        for (const id of leadCandidate.cveIds) {
          const row = kevMap.get(id.toUpperCase());
          if (row) { kevRow = row; break; }
        }
      } catch {
        kevRow = null;
      }
    }
    lead = {
      ...toRow(leadCandidate),
      summary: leadCandidate.summaryEn || "",
      cveIds: leadCandidate.cveIds,
      cvss: leadCandidate.cvss,
      epss: leadCandidate.epss,
      sourceCode: outletCode(leadCandidate.sourceUrl),
      sourceHost: outletHost(leadCandidate.sourceUrl),
      sourceUrl: /^https?:\/\//i.test(leadCandidate.sourceUrl || "") ? leadCandidate.sourceUrl : "",
      kevAdded: kevRow?.dateAdded ?? null,
      kevDue: kevRow?.dueDate ?? null,
      ransomware: kevRow?.ransomware ?? false,
    };
  }

  // Newest-first, then thinned so no single source owns the column (lib/wire-select).
  const wire: WireRow[] = selectWire(
    candidates.filter((c) => c !== leadCandidate),
    WIRE_ROWS,
    WIRE_MAX_PER_SOURCE
  ).map(toRow);

  // Yesterday's paper: the previous day's dispatches with their own ordinals.
  let yesterday: WireRow[] = [];
  let yesterdayKey: string | null = null;
  const prevAt = previousDay[0]?.published_at ? new Date(previousDay[0].published_at) : null;
  if (prevAt) {
    const dayStart = utcDayStart(prevAt);
    const dayEnd = new Date(dayStart.getTime() + DAY);
    yesterdayKey = dayKey(dayStart);
    const ydocs = await col
      .find({ ...PUBLISHED_FILTER, published_at: { $gte: dayStart, $lt: dayEnd } })
      .sort({ effective_at: -1 })
      .limit(YESTERDAY_ROWS)
      .project<StoryDoc>(PROJECTION)
      .toArray();
    // Each row's place in the ledger: how many published stories happened after it.
    const ranks = await Promise.all(
      ydocs.map((d) =>
        d.effective_at
          ? col.countDocuments({ ...PUBLISHED_FILTER, effective_at: { $gt: new Date(d.effective_at) } })
          : Promise.resolve(0)
      )
    );
    yesterday = ydocs.map((d, i) => toRow({ ...toStory(d), source: d.source, ordinal: total - ranks[i] }));
  }

  return {
    wire,
    lead,
    week: { dispatches, kev, cves, sources: sources.length },
    daily,
    total,
    latestAt: newestDispatch[0]?.published_at
      ? new Date(newestDispatch[0].published_at).toISOString()
      : null,
    firstAt: firstDispatch[0]?.published_at ? new Date(firstDispatch[0].published_at).toISOString() : null,
    last24h: last24hRaw
      .filter((d) => d.published_at)
      .map((d) => ({ at: new Date(d.published_at!).toISOString(), kev: Boolean(d.kev) })),
    yesterday,
    yesterdayKey,
    generatedAt: now.toISOString(),
  };
}

// v10 (2026-10-16): the Late Edition blob (lead, ordinals, last24h, yesterday).
// The blob is also kept as a last-good file (lib/snapshot.ts), so a redeploy
// while the database is unreachable serves the previous blob, with its own
// generatedAt, instead of an empty front page.
export const getHomeData = unstable_cache(
  () => withSnapshot("home-data", computeHomeData),
  ["home-data-v10"],
  { revalidate: 3600 },
);

// The front page must render even if Mongo is unreachable — an empty wire is
// a quiet page, a thrown error is a dead landing page.
export const EMPTY_HOME_DATA: HomeData = {
  wire: [],
  lead: null,
  week: { dispatches: 0, kev: 0, cves: 0, sources: 0 },
  daily: [],
  total: 0,
  latestAt: null,
  firstAt: null,
  last24h: [],
  yesterday: [],
  yesterdayKey: null,
  generatedAt: new Date(0).toISOString(),
};
