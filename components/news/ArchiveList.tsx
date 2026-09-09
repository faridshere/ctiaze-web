"use client";

import { useSyncExternalStore } from "react";
import { LocalTime } from "@/components/site/LocalTime";
import Link from "next/link";

// One archive row — enough to scan a slug, its title and its priority flags
// without opening it. `at` is an ISO-8601 UTC instant (Mongo's effective_at:
// when the SOURCE published the story, not when we dispatched it).
export type ArchiveRow = {
  slug: string;
  title: string;
  kev: boolean;
  cve: string | null;
  at: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The divider and the row time have to agree, or the ledger stops being a
// ledger. They didn't: the dividers were pinned to UTC while <LocalTime> renders
// each row in the READER's zone, so 9 of the 60 rows on page 1 showed a time
// belonging to the next day underneath the previous day's heading — "02:23"
// filed under "TUE 08 SEP 2026", sitting above rows reading 23:17. Read from
// Baku the archive was simply not in chronological order.
//
// So the grouping follows the same zone the times do. The server has no reader
// zone to use, so it groups in UTC (matching the fallback string <LocalTime>
// renders at that point) and the client regroups once mounted — a post-mount
// re-render, not a hydration mismatch: the first client render is identical to
// the server's. Same useSyncExternalStore trick LocalTime uses.
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

function dayKey(iso: string, local: boolean): string {
  if (!local) return iso.slice(0, 10);
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(iso: string, local: boolean): string {
  const d = new Date(iso);
  const [wd, day, mon, year] = local
    ? [d.getDay(), d.getDate(), d.getMonth(), d.getFullYear()]
    : [d.getUTCDay(), d.getUTCDate(), d.getUTCMonth(), d.getUTCFullYear()];
  return `${WEEKDAYS[wd]} ${String(day).padStart(2, "0")} ${MONTHS[mon]} ${year}`;
}

function utcTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// The full archive as a dated ledger: a sticky day divider (so the header always
// tells you which day you're scrolled into) over rows of [time | title | flags].
export function ArchiveList({ rows }: { rows: ArchiveRow[] }) {
  // Precomputed once, then read by index — reassigning a "last seen day" variable
  // inside the .map callback trips the purity lint (mutation escaping render), so
  // "is this the first row of a new day" is derived purely from position instead.
  const local = useSyncExternalStore(subscribe, onClient, onServer);
  const dayKeys = rows.map((r) => dayKey(r.at, local));
  return (
    <div className="mx-auto mt-10 w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <ol>
        {rows.map((r, i) => {
          const isNewDay = i === 0 || dayKeys[i] !== dayKeys[i - 1];
          return (
            <li key={r.slug}>
              {isNewDay && (
                <div className={`sticky top-14 z-10 flex items-center gap-3 bg-surface/95 py-2.5 backdrop-blur-sm ${i === 0 ? "" : "mt-8"}`}>
                  <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                    {dayLabel(r.at, local)}
                  </span>
                  <span aria-hidden className="limb-line h-px flex-1" />
                </div>
              )}
              <Link
                href={`/news/${r.slug}`}
                className="group grid grid-cols-[3.25rem_1fr_auto] items-baseline gap-4 border-b border-hairline py-3.5 transition-colors hover:bg-surface-hover sm:grid-cols-[3.75rem_1fr_auto]"
              >
                <LocalTime
                  iso={r.at}
                  shape="time"
                  className="whitespace-nowrap font-mono text-[11px] tabular-nums text-ink-muted"
                  fallback={utcTime(r.at)}
                />
                <span className="text-[15px] leading-snug text-ink-primary transition-colors group-hover:text-brand sm:text-[16px]">
                  {r.title}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  {r.kev && (
                    <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-semibold text-surface">
                      KEV
                    </span>
                  )}
                  {r.cve && (
                    <span className="rounded-[var(--radius-chip)] border border-hairline px-1 py-px text-ink-muted">
                      {r.cve}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
