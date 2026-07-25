// The ONE place color appears functionally on the site — reserved for KEV /
// critical signal, per the chosen "wire service" direction. Color never carries
// meaning alone (dataviz skill: status colors ship with icon + label), and
// anything below "high" gets no marker at all — that restraint is the point.
export function SeverityMarker({
  kev,
  severity,
}: {
  kev: boolean;
  severity: string | null;
}) {
  if (kev) {
    return (
      <span className="inline-flex items-center gap-1.5 text-accent-critical">
        <span className="size-1.5 rounded-full bg-accent-critical" aria-hidden />
        <span className="font-mono text-[11px] font-medium tracking-wider">KEV</span>
      </span>
    );
  }
  if (severity === "critical") {
    return (
      <span className="inline-flex items-center gap-1.5 text-accent-critical">
        <span className="size-1.5 rounded-full bg-accent-critical" aria-hidden />
        <span className="font-mono text-[11px] font-medium tracking-wider">CRITICAL</span>
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
