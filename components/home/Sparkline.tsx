// Fourteen days of dispatches as bars — a pure SVG from real counts. Quiet
// gaps stay quiet: a zero day renders as a hairline stub, never hidden, so the
// chart is honest about the days the wire was silent.
export function Sparkline({ data, className = "" }: { data: { day: string; n: number }[]; className?: string }) {
  const W = 280, H = 72, GAP = 4;
  const max = Math.max(1, ...data.map((d) => d.n));
  const bw = data.length ? (W - GAP * (data.length - 1)) / data.length : W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Dispatches per day, last ${data.length} days`}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.n / max) * (H - 4));
        return (
          <rect
            key={d.day}
            x={i * (bw + GAP)}
            y={H - h}
            width={bw}
            height={h}
            rx={1.5}
            fill="var(--limb)"
            opacity={d.n === 0 ? 0.25 : 0.45 + 0.45 * (d.n / max)}
          >
            <title>{`${d.day}: ${d.n}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
