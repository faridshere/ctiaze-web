import type { AptReport } from "@/lib/aptnotes";
import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

// Outbound links to primary-source analyst reports (Mandiant, Unit42,
// CrowdStrike…) that name this actor or one of its aliases, indexed from the
// public APTnotes project. We link out — we never re-host the PDFs.
export function ActorReports({ reports }: { reports: AptReport[] }) {
  if (reports.length === 0) return null;
  return (
    <section className={DOSSIER_SECTION} aria-labelledby="reports-head">
      <SectionHead id="reports-head" aside="via APTnotes · linked, never re-hosted">
        Primary-source reports
      </SectionHead>
      <ol>
        {reports.map((r) => (
          <li key={r.url} className="row">
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5 py-2.5 sm:grid-cols-[5ch_1fr_auto]"
            >
              <span className="num font-mono text-[11px] text-ink-3">{r.year}</span>
              <span className="text-[14px] leading-snug text-ink underline-offset-[3px] group-hover:underline">{r.title}</span>
              {r.source && <span className="label col-start-2 text-ink-3 sm:col-start-3">{r.source} ↗</span>}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
