// Priority flags — rendered ONLY when true. At the archive's real rates
// (KEV ~1%, CVE ~15%, AZ ~6%), most rows carry none, so a lit flag is loud and
// the page's density of red literally tracks the feed's threat density.
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
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {kev && <span className="stamp">Actively exploited</span>}
      {epssLabel && <span className="tag text-caution">{epssLabel}</span>}
      {hasCve && <span className="tag text-ink-2">{cveIds.length === 1 ? cveIds[0] : `${cveIds.length} CVE`}</span>}
      {region && <span className="tag text-ink">AZ</span>}
    </span>
  );
}
