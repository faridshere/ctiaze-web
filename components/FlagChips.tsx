// Priority flags — rendered ONLY when true. At the archive's real rates
// (KEV ~1%, CVE ~15%, AZ ~6%), most rows carry none, so a lit flag is loud and
// the page's color density literally tracks the feed's threat density. Severity
// is never shown (null across the archive) — there is no severity flag.
export function FlagChips({
  kev,
  cveIds,
  region,
  epssLabel = null,
  className = "",
}: {
  kev: boolean;
  cveIds: string[];
  region: boolean;
  // Pre-computed by storysignal.epssBadge() — non-null only when the exploit
  // probability is genuinely alarming (>=50%), so the chip stays rare and loud.
  epssLabel?: string | null;
  className?: string;
}) {
  const hasCve = cveIds.length > 0;
  if (!kev && !hasCve && !region && !epssLabel) return null;
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.06em] ${className}`}
    >
      {kev && (
        <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-semibold text-surface">
          KEV
        </span>
      )}
      {epssLabel && (
        <span className="rounded-[var(--radius-chip)] border border-accent-warning px-1 py-px font-semibold text-accent-warning">
          {epssLabel}
        </span>
      )}
      {hasCve && (
        <span className="rounded-[var(--radius-chip)] border border-ink-secondary px-1 py-px text-ink-secondary">
          {cveIds.length === 1 ? cveIds[0] : `${cveIds.length} CVE`}
        </span>
      )}
      {region && (
        <span className="rounded-[var(--radius-chip)] bg-brand px-1 py-px font-semibold text-surface">
          AZ
        </span>
      )}
    </span>
  );
}
