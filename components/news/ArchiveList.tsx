"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { LocalTime } from "@/components/site/LocalTime";
import { GlyphChip } from "@/components/GlyphChip";

// One archive row — enough to scan a dispatch, its place in the paper and its
// priority flags without opening it. `at` is an ISO-8601 UTC instant (Mongo's
// effective_at: when the SOURCE published the story, not when we dispatched
// it). `ordinal` is the story's running number in the archive, computed by the
// page from the total and the page offset.
export type ArchiveRow = {
  slug: string;
  title: string;
  kev: boolean;
  cve: string | null;
  at: string;
  category: string;
  severity: string | null;
  ordinal: number;
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

// Titles arrive whole: lib/types.ts ends any title the engine cut on its last
// whole word or sentence (wholeTitle), so nothing is clipped or closed here.
// This used to append "…" to every long title, after a partial word too.
// Backtick spans (`href`) are set in mono the way the story deck sets them;
// the backticks themselves never print.
function titleParts(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.length > 2 && p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="font-mono text-[0.88em] text-ink">
        {p.slice(1, -1)}
      </code>
    ) : (
      p.replace(/`/g, "")
    )
  );
}

function utcTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// The bottom rule of a row is a data channel (globals.css .row[data-sev]):
// 1px soft by default, 2px ink for high severity, a 3px double rule in stamp
// red for anything actively exploited. Same weights as the front page's wire.
function sevOf(row: { kev: boolean; severity: string | null }): string | undefined {
  if (row.kev) return "kev";
  if (row.severity === "critical") return "critical";
  if (row.severity === "high") return "high";
  return undefined;
}

// The full archive as every edition's ledger: a dateline for each day set INTO
// a 2px rule (the label, then the rule filling the rest, like the "Earlier
// edition" head on the front page), over rows of № | HH:MM | title | tags in
// the wire's row language. The dateline stays pinned under the header while
// its day scrolls, on solid paper, so the reader always knows the edition.
export function ArchiveList({ rows }: { rows: ArchiveRow[] }) {
  // Precomputed once, then read by index — reassigning a "last seen day" variable
  // inside the .map callback trips the purity lint (mutation escaping render), so
  // "is this the first row of a new day" is derived purely from position instead.
  const local = useSyncExternalStore(subscribe, onClient, onServer);
  const dayKeys = rows.map((r) => dayKey(r.at, local));
  const dayCounts = new Map<string, number>();
  for (const k of dayKeys) dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);

  if (rows.length === 0) {
    return (
      <div className="sheet mt-10">
        <p className="label py-6 text-ink-3">Nothing filed on this page.</p>
      </div>
    );
  }

  return (
    <div className="sheet mt-8">
      <ol>
        {rows.map((r, i) => {
          const isNewDay = i === 0 || dayKeys[i] !== dayKeys[i - 1];
          const n = dayCounts.get(dayKeys[i]) ?? 0;
          return (
            <li key={r.slug}>
              {isNewDay && (
                <div className={`sticky top-[78px] z-10 flex items-center gap-4 bg-paper pt-3 pb-2 ${i === 0 ? "" : "mt-8"}`}>
                  <h2 className="label whitespace-nowrap text-ink">{dayLabel(r.at, local)}</h2>
                  <span aria-hidden className="h-[2px] flex-1 bg-ink" />
                  <span className="label whitespace-nowrap text-ink-3">
                    {n} dispatch{n === 1 ? "" : "es"}
                  </span>
                </div>
              )}
              <div className="row" data-sev={sevOf(r)}>
                <Link
                  href={`/news/${r.slug}`}
                  className="group grid min-h-[44px] grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5 sm:grid-cols-[auto_auto_1fr_auto] sm:gap-x-4"
                >
                  <span className="num hidden w-[7.5ch] whitespace-nowrap font-mono text-[11px] text-ink-3 sm:inline">
                    № {r.ordinal.toLocaleString("en-US")}
                  </span>
                  <LocalTime iso={r.at} shape="time" className="num whitespace-nowrap font-mono text-[11px] text-ink-3" fallback={utcTime(r.at)} />
                  <span className="text-[15px] leading-[1.3] text-ink underline-offset-[3px] group-hover:underline sm:text-[16px]">{titleParts(r.title)}</span>
                  <span className="flex items-center gap-1.5">
                    {/* `.tag` sets its own display in globals.css (unlayered), so
                        `hidden` cannot switch it off: the breakpoint lives on a
                        plain wrapper instead, and the chip stays off phones. */}
                    {r.cve && (
                      <span className="hidden sm:inline-flex">
                        <span className="tag text-ink-2">{r.cve}</span>
                      </span>
                    )}
                    {r.kev ? <span className="stamp">KEV</span> : <GlyphChip category={r.category} />}
                  </span>
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
