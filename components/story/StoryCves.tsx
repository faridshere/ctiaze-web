import type { CveBadge } from "@/lib/cveintel";

// The CVE detail list. /cve is shelved under app/_disabled, so each id links
// straight out to NVD rather than to the site's own (currently dark) registry.
export function StoryCves({ cveIds, badges }: { cveIds: string[]; badges: Map<string, CveBadge> }) {
  if (cveIds.length === 0) return null;
  return (
    <div className="mt-8 border-t border-hairline pt-6">
      <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted">
        CVE · detail
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {cveIds.map((cve) => {
          const b = badges.get(cve.toUpperCase());
          const epssPct = b?.epss != null ? b.epss * 100 : null;
          return (
            <li key={cve} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[length:var(--t-meta)] text-ink-primary transition-colors hover:text-brand"
              >
                {cve} ↗
              </a>
              {b?.kev && (
                <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-mono text-[length:var(--t-micro)] font-semibold uppercase text-surface">
                  KEV
                </span>
              )}
              {epssPct != null && (
                <span className="rounded-[var(--radius-chip)] border border-ink-secondary px-1 py-px font-mono text-[length:var(--t-micro)] text-ink-secondary">
                  EPSS {epssPct.toFixed(epssPct < 1 ? 2 : 0)}%
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
