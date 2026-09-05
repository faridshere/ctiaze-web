import Link from "next/link";
import type { WireRow } from "@/lib/home-data";
import { GlyphChip } from "@/components/GlyphChip";
import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import { Button } from "@/components/site/Button";
import { UtcClock } from "./UtcClock";

// The signature move: the product itself, straddling the seam between the hero
// and the page. A real panel of the latest dispatches — severity dot, title,
// category glyph, UTC stamp — with a ticking clock in the title bar, so the
// first thing a visitor sees below the fold is the wire, live, not a claim.
function sevDot(row: WireRow): string {
  if (row.kev || row.severity === "critical") return "bg-accent-critical";
  if (row.severity === "high") return "bg-accent-serious";
  return "bg-ink-muted/60";
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function WirePanel({ rows, total }: { rows: WireRow[]; total: number }) {
  if (rows.length === 0) return null;
  return (
    <Panel limb className="mx-auto w-full max-w-[56rem]">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3 sm:px-6">
        <Kicker live>On the wire</Kicker>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted sm:inline">
            {total.toLocaleString("en-US")} dispatches
          </span>
          <UtcClock />
        </div>
      </div>
      <ol>
        {rows.map((r, i) => (
          <li key={r.slug} className="wire-row border-b border-hairline last:border-b-0" style={{ "--i": i } as React.CSSProperties}>
            <Link
              href={`/news/${r.slug}`}
              className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-hover sm:gap-4 sm:px-6"
            >
              <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${sevDot(r)}`} />
              <span className="min-w-0 flex-1 truncate text-[14px] leading-snug text-ink-primary/90 transition-colors group-hover:text-ink-primary">
                {r.title}
              </span>
              <GlyphChip category={r.category} className="hidden sm:inline-block" />
              {r.kev && (
                <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-mono text-[10px] font-semibold uppercase text-surface">
                  KEV
                </span>
              )}
              <time dateTime={r.at} className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">
                {hhmm(r.at)}
              </time>
            </Link>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-4 border-t border-hairline px-5 py-3 sm:px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          grounded to source · UTC
        </span>
        <Button href="/news" variant="ghost" size="sm" glyph="→">
          Open the archive
        </Button>
      </div>
    </Panel>
  );
}
