import { Kicker } from "@/components/site/Kicker";
import type { AptReport } from "@/lib/aptnotes";

// Outbound links to primary-source analyst reports (Mandiant, Unit42,
// CrowdStrike…) that name this actor or one of its aliases, indexed from the
// public APTnotes project. We link out — we never re-host the PDFs.
export function ActorReports({ reports }: { reports: AptReport[] }) {
  if (reports.length === 0) return null;
  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Kicker>Primary-source reports</Kicker>
      <ul className="mt-5 space-y-2.5">
        {reports.map((r) => (
          <li key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-hairline pb-2.5 hover:opacity-90"
            >
              <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-ink-muted">{r.year}</span>
              <span className="text-[14px] leading-snug text-ink-primary transition-colors group-hover:text-brand">
                {r.title}
              </span>
              {r.source && <span className="font-mono text-[11px] text-ink-muted">{r.source} ↗</span>}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
