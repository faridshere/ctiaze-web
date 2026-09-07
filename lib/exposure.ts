import { unstable_cache } from "next/cache";
import { getDb } from "./db";

// The weekly internet-exposure census, read for the website.
//
// The engine has been sweeping Shodan for a fixed watchlist of internet-facing
// products every week and storing the counts, and none of it was ever shown:
// the footer claimed "exposure census" while the site displayed no census. This
// is the smallest honest way to close that gap — the numbers as measured, dated,
// with the previous sweep alongside so a reader can see movement rather than a
// single figure they have to take on faith.
//
// It is a SCAN COUNT, not an inventory. Shodan sees what answers a probe from
// the public internet; it does not see what is patched, what is behind a VPN,
// or what a honeypot is pretending to be. Every surface that renders this must
// say so — an unqualified "422,772 exposed" is a number people will quote.

export type ExposureRow = {
  name: string;
  count: number;
  /** The same product's count in the previous sweep, when we have one. */
  previous: number | null;
};

export type ExposureCensus = {
  rows: ExposureRow[];
  measuredAt: string | null;
  previousAt: string | null;
};

type WatchEntry = { name?: string; note?: string; count?: number };
type Snapshot = {
  swept_at?: Date | string;
  global_swept_at?: Date | string;
  watchlist_global?: Record<string, WatchEntry> | WatchEntry[];
};

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

const entries = (w: Snapshot["watchlist_global"]): WatchEntry[] =>
  !w ? [] : Array.isArray(w) ? w : Object.values(w);

async function computeCensus(): Promise<ExposureCensus> {
  const db = await getDb();
  // Two sweeps: the newest for the figures, the one before it for movement.
  // Deliberately NOT filtered on "watchlist_global.0": that only matches an
  // array, and the field is stored as an object map keyed "0","1",…. It works
  // by accident today and would return an empty census the day the shape moves.
  // Fetch a few, then pick the newest that actually carries entries.
  const snaps = (await db
    .collection<Snapshot>("exposure_snapshots")
    .find({ watchlist_global: { $exists: true } } as never, {
      projection: { watchlist_global: 1, global_swept_at: 1, swept_at: 1 },
    })
    .sort({ global_swept_at: -1, swept_at: -1 })
    .limit(6)
    .toArray()) as Snapshot[];

  const usable = snaps.filter((s) => entries(s.watchlist_global).some((e) => typeof e.count === "number"));
  const latest = usable[0];
  if (!latest) return { rows: [], measuredAt: null, previousAt: null };

  const prev = new Map<string, number>();
  for (const e of entries(usable[1]?.watchlist_global)) {
    if (e.name && typeof e.count === "number") prev.set(e.name, e.count);
  }

  const rows = entries(latest.watchlist_global)
    .filter((e): e is WatchEntry & { name: string; count: number } =>
      typeof e.name === "string" && typeof e.count === "number" && e.count > 0)
    .map((e) => ({ name: e.name, count: e.count, previous: prev.get(e.name) ?? null }))
    .sort((a, b) => b.count - a.count);

  return {
    rows,
    measuredAt: iso(latest.global_swept_at ?? latest.swept_at),
    previousAt: iso(usable[1]?.global_swept_at ?? usable[1]?.swept_at),
  };
}

export const getExposureCensus = unstable_cache(computeCensus, ["exposure-census-v1"], { revalidate: 3600 });

export const EMPTY_CENSUS: ExposureCensus = { rows: [], measuredAt: null, previousAt: null };
