// Fourteen days of dispatches as ink bars, a pure SVG from real counts. A zero
// day renders as a hairline stub, never hidden, so the chart is honest about
// the days the wire was silent. Bars grow from the baseline when the section
// reveals (CSS, keyed by --i; see globals.css).
export function Sparkline({ data, className = "" }: { data: { day: string; n: number }[]; className?: string }) {
  const W = 140, H = 36, GAP = 3;
  const max = Math.max(1, ...data.map((d) => d.n));
  const bw = data.length ? (W - GAP * (data.length - 1)) / data.length : W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Dispatches per day, last ${data.length} days`}>
      <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="var(--ink)" strokeWidth="1" />
      {data.map((d, i) => {
        const h = Math.max(1.5, (d.n / max) * (H - 4));
        return (
          <rect
            key={d.day}
            className="spark-bar"
            style={{ "--i": i } as React.CSSProperties}
            x={i * (bw + GAP)}
            y={H - 1 - h}
            width={bw}
            height={h}
            fill="var(--ink)"
            opacity={d.n === 0 ? 0.25 : 0.55 + 0.45 * (d.n / max)}
          >
            <title>{`${d.day}: ${d.n}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
