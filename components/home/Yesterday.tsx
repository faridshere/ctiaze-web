import Link from "next/link";
import type { WireRow } from "@/lib/home-data";
import { GlyphChip } from "@/components/GlyphChip";
import { sevOf } from "./Wire";

// The earlier edition: the previous day that had dispatches, set in two
// newspaper columns with each story's running number, proving the masthead's
// edition number is a count and not a claim.
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function Yesterday({ rows, dayKey }: { rows: WireRow[]; dayKey: string | null }) {
  if (!dayKey || rows.length === 0) return null;
  return (
    <section className="sheet pt-[var(--sp-section)]" aria-labelledby="yesterday-head">
      <div className="flex items-center gap-4">
        <h2 id="yesterday-head" className="label whitespace-nowrap text-ink">
          Earlier edition · {dayLabel(dayKey)}
        </h2>
        <span aria-hidden className="h-[2px] flex-1 bg-ink" />
        <Link href="/news" className="label ulink whitespace-nowrap text-ink-3 hover:text-ink">
          Every edition →
        </Link>
      </div>
      <ol data-sc className="mt-4 grid gap-x-10 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.slug} className="row" data-sev={sevOf(r)}>
            <Link href={`/news/${r.slug}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3 sm:grid-cols-[auto_auto_1fr_auto]">
              <span className="num hidden w-[7.5ch] whitespace-nowrap font-mono text-[11px] text-ink-3 sm:inline">№ {r.ordinal.toLocaleString("en-US")}</span>
              <span className="num font-mono text-[11px] text-ink-3">{hhmm(r.at)}</span>
              <span className="text-[14px] leading-[1.3] text-ink group-hover:underline">{r.title}</span>
              <span className="flex items-center gap-1.5">
                {r.cve && <span className="tag hidden text-ink-2 sm:inline-block">{r.cve}</span>}
                {r.kev ? <span className="stamp">KEV</span> : <GlyphChip category={r.category} />}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
