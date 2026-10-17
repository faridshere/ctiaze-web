import Link from "next/link";
import type { WireRow } from "@/lib/home-data";
import { GlyphChip } from "@/components/GlyphChip";
import { Waitlist } from "@/components/Waitlist";
import { UtcClock } from "./UtcClock";

// THE WIRE: the newest dispatches as a ruled column, every time in UTC like
// the rest of the front page. The bottom rule of every row is a data channel:
// 1px soft by default, 2px ink for high severity, a 3px double rule in stamp
// red for anything actively exploited. The running number is the story's
// place in the archive; where the column skips numbers (one source may hold
// at most two rows, so a burst of advisories does not own the front page)
// a gap row says how many dispatches sit between, in the archive.
export function sevOf(row: { kev: boolean; severity: string | null }): string | undefined {
  if (row.kev) return "kev";
  if (row.severity === "critical") return "critical";
  if (row.severity === "high") return "high";
  return undefined;
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function WireRowItem({ row, i, land = false }: { row: WireRow; i: number; land?: boolean }) {
  return (
    <li
      className={`row wire-row ${land ? "row-land" : ""}`}
      data-sev={sevOf(row)}
      data-slug={row.slug}
      data-ordinal={row.ordinal}
      style={{ "--i": i } as React.CSSProperties}
    >
      <Link
        href={`/news/${row.slug}`}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-3 sm:grid-cols-[auto_auto_1fr_auto]"
      >
        <span className="num hidden w-[7.5ch] whitespace-nowrap font-mono text-[11px] text-ink-3 sm:inline">№ {row.ordinal.toLocaleString("en-US")}</span>
        <time dateTime={row.at} className="num font-mono text-[11px] text-ink-3">
          {hhmm(row.at)}
        </time>
        <span className="flex items-center gap-1.5 sm:order-4">
          {row.kev ? <span className="stamp">KEV</span> : <GlyphChip category={row.category} />}
        </span>
        <span className="col-span-2 text-[14px] leading-[1.3] text-ink underline-offset-[3px] group-hover:underline sm:col-span-1 sm:order-3">{row.title}</span>
      </Link>
    </li>
  );
}

function GapRow({ n }: { n: number }) {
  return (
    <li className="row" data-gap>
      <Link href="/news" className="label flex items-center gap-3 py-1.5 text-ink-3 hover:text-ink">
        <span aria-hidden className="h-px w-5 bg-rule-soft" />
        {n.toLocaleString("en-US")} more in the archive →
      </Link>
    </li>
  );
}

export function Wire({ rows, total }: { rows: WireRow[]; total: number }) {
  const items: React.ReactNode[] = [];
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (prev && prev.ordinal - r.ordinal > 1) items.push(<GapRow key={`gap-${r.slug}`} n={prev.ordinal - r.ordinal - 1} />);
    items.push(<WireRowItem key={r.slug} row={r} i={i} />);
  });
  return (
    <section aria-labelledby="wire-head" className="flex h-full flex-col" data-wire>
      <div className="rule-b flex items-center justify-between pb-2">
        <h2 id="wire-head" className="label flex items-center gap-2 text-ink">
          <span aria-hidden className="live-dot" />
          The wire
        </h2>
        <UtcClock className="text-ink-3" />
      </div>
      {rows.length > 0 ? <ol data-wire-rows>{items}</ol> : <p className="label py-6 text-ink-3">The wire is quiet. The archive is not.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
        <Link href="/news" className="label ulink text-ink">
          Open the archive →
        </Link>
        <span className="label text-ink-3">{total.toLocaleString("en-US")} dispatches · times UTC</span>
      </div>

      <div className="double-box mt-8 p-4 sm:p-5">
        <p className="label text-ink">Email alerts are next</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">One email when they open. Until then, the wire is Telegram, RSS and JSON.</p>
        <div className="mt-4">
          <Waitlist source="skopnix-landing:wire" />
        </div>
      </div>
    </section>
  );
}
