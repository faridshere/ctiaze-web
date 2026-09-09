// Which dispatches make the landing page's wire panel.
//
// Pure and dependency-free on purpose: lib/home-data.ts imports ./db, which
// throws at import time without MONGO_URI_READONLY, so the selection rule lives
// here where a test can reach it (same split as lib/actor-match.ts).
//
// The rule is a per-source cap. The wire is ordered by when the news happened,
// and some feeds publish in bursts — GitHub's advisory feed emitted 20 GHSA
// entries inside four minutes on the evening of 08 Sep 2026, which took five of
// the seven rows above the fold and pushed a Chrome zero-day and a KEV addition
// off the panel. Capping a source promotes the next story down instead.
//
// It never reorders: rows stay strictly newest-first, and nothing is hidden —
// /news remains the complete ledger.
//
// The cap is SOFT. Enforced strictly it would shrink the panel on any day whose
// news came from too few sources — a quiet Sunday drawn from two feeds would
// render three rows instead of seven, and a half-empty wire reads worse than a
// repetitive one. So a second pass appends the skipped items until the panel is
// full: diversity decides who goes first, never how many.
//
// Those appended rows are the one place the panel departs from strict newest-
// first — a demoted row lands below fresher ones rather than at its own rank,
// which is the point of demoting it. Simulated over the 60 most recent windows
// of live data (9 distinct sources in the newest 40), the backfill never fired
// once; it exists for the degenerate day, not the normal one.
export type Selectable = { source?: string; kev?: boolean };

export function selectWire<T extends Selectable>(
  candidates: readonly T[],
  rows: number,
  maxPerSource: number
): T[] {
  const used = new Map<string, number>();
  const picked = new Set<T>();
  const out: T[] = [];

  for (const c of candidates) {
    if (out.length >= rows) break;
    const src = c.source ?? "";
    const n = used.get(src) ?? 0;
    // A KEV is exempt. An actively-exploited story is never held off the wire to
    // make room for variety — variety is a tiebreaker, not a filter.
    if (!c.kev && n >= maxPerSource) continue;
    used.set(src, n + 1);
    picked.add(c);
    out.push(c);
  }

  for (const c of candidates) {
    if (out.length >= rows) break;
    if (!picked.has(c)) out.push(c);
  }
  return out;
}
