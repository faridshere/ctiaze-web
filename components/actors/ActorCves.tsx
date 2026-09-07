import Link from "next/link";
import { Kicker } from "@/components/site/Kicker";
import type { ActorCve } from "@/lib/threatactors";

// CVEs our own dispatches named in the same reporting as this adversary.
//
// The heading says "named alongside", not "exploits", and the note says so
// again: a story can name a group and a flaw without the group having used the
// flaw. Calling that "exploits" would be the single easiest way for this site
// to start publishing attribution it cannot support, so it does not.
export function ActorCves({ cves, actorName }: { cves: ActorCve[]; actorName: string }) {
  if (cves.length === 0) return null;
  // KEV first (observed exploitation), then by EPSS, then newest.
  const rows = [...cves]
    .sort(
      (a, b) =>
        Number(!!b.kev) - Number(!!a.kev) ||
        (b.epss ?? 0) - (a.epss ?? 0) ||
        (b.date ?? "").localeCompare(a.date ?? "")
    )
    .slice(0, 24);
  const kevCount = rows.filter((r) => r.kev).length;

  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <Kicker>CVEs named alongside {actorName}</Kicker>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          {kevCount > 0 ? `${kevCount} on CISA KEV` : "none on KEV"}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {rows.map((c) => (
          <Link
            key={c.cve}
            href={`/cve/${c.cve.toUpperCase()}`}
            className="group inline-flex items-center gap-2 rounded-[var(--radius-chip)] border border-hairline px-2.5 py-1.5 transition-colors hover:border-brand"
          >
            <span className="font-mono text-[12px] text-ink-primary transition-colors group-hover:text-brand">
              {c.cve.toUpperCase()}
            </span>
            {c.kev && (
              <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-surface">
                KEV
              </span>
            )}
            {!c.kev && c.epss != null && c.epss >= 0.1 && (
              <span className="font-mono text-[10px] text-ink-muted">EPSS {Math.round(c.epss * 100)}%</span>
            )}
          </Link>
        ))}
      </div>
      <p className="mt-4 max-w-[52rem] text-[13px] leading-relaxed text-ink-muted">
        These CVEs appeared in the same dispatches as {actorName}. That is an association in reporting, not a claim
        that this group used them — read the dispatch, then the vendor advisory, before you treat it as either.
      </p>
    </section>
  );
}
