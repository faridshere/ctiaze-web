// The ONE place color appears functionally on the site — reserved for KEV /
// critical signal, per the chosen "wire service" direction. Color never carries
// meaning alone, and anything below "high" gets no marker at all — that
// restraint is the point. Severity escalates in visual weight too: KEV (rarest,
// most urgent) gets a hand-stamped classification mark; critical gets a plain
// bordered tag; high stays a quiet dot + label.
export function SeverityMarker({
  kev,
  severity,
}: {
  kev: boolean;
  severity: string | null;
}) {
  if (kev) {
    return (
      <span
        className="inline-block align-middle -rotate-3 border-2 border-double border-accent-critical px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-widest text-accent-critical"
        title="Known Exploited Vulnerability — aktiv istismar edilir"
      >
        kev
      </span>
    );
  }
  if (severity === "critical") {
    return (
      <span className="inline-block align-middle border border-accent-critical px-1 py-0 font-mono text-[10px] font-medium uppercase tracking-wider text-accent-critical">
        critical
      </span>
    );
  }
  if (severity === "high") {
    return (
      <span className="inline-flex items-center gap-1.5 text-accent-serious">
        <span className="size-1.5 rounded-full bg-accent-serious" aria-hidden />
        <span className="font-mono text-[11px] font-medium tracking-wider">HIGH</span>
      </span>
    );
  }
  return null;
}
