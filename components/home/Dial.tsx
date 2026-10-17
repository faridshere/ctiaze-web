import { DialHand } from "./DialHand";

// The masthead dial: a 24-hour clock face whose ticks are the dispatches of the
// last 24 hours, one line per dispatch at its UTC hour and minute, KEV ones in
// stamp red and longer. The hand (client) turns once a day. Real data only: an
// empty day is a ring with no ticks and says so in its caption.
export function dialCaption(last24h: { at: string; kev: boolean }[]): string {
  const n = last24h.length;
  const k = last24h.filter((d) => d.kev).length;
  if (n === 0) return "Last 24 h · no dispatch";
  return `Last 24 h · ${n} dispatch${n === 1 ? "" : "es"}${k ? ` · ${k} KEV` : ""}`;
}

export function Dial({
  last24h,
  size = 64,
  className = "",
}: {
  last24h: { at: string; kev: boolean }[];
  size?: number;
  className?: string;
}) {
  const R = 50;
  const ticks = last24h
    .map((d) => {
      const t = new Date(d.at);
      if (Number.isNaN(t.getTime())) return null;
      const minutes = t.getUTCHours() * 60 + t.getUTCMinutes();
      return { angle: (minutes / 1440) * 360, kev: d.kev };
    })
    .filter((x): x is { angle: number; kev: boolean } => x !== null);
  const title = `${dialCaption(last24h)}, by UTC hour`;

  const hourMark = (h: number) => {
    const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
    const major = h % 6 === 0;
    const r1 = major ? R - 9 : R - 5;
    return (
      <line
        key={`h${h}`}
        x1={60 + r1 * Math.cos(a)}
        y1={60 + r1 * Math.sin(a)}
        x2={60 + R * Math.cos(a)}
        y2={60 + R * Math.sin(a)}
        stroke="var(--ink-2)"
        strokeWidth={major ? 2 : 1}
      />
    );
  };

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      {Array.from({ length: 24 }, (_, h) => hourMark(h))}
      {[0, 6, 12, 18].map((h) => {
        const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
        const r = R - 18;
        return (
          <text
            key={`t${h}`}
            x={60 + r * Math.cos(a)}
            y={60 + r * Math.sin(a) + 3}
            textAnchor="middle"
            fontSize="9"
            fontFamily="var(--font-mono)"
            fill="var(--ink-3)"
          >
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
      {ticks.map((t, i) => {
        const a = (t.angle - 90) * (Math.PI / 180);
        const r2 = R + (t.kev ? 9 : 6);
        return (
          <line
            key={i}
            x1={60 + (R + 1) * Math.cos(a)}
            y1={60 + (R + 1) * Math.sin(a)}
            x2={60 + r2 * Math.cos(a)}
            y2={60 + r2 * Math.sin(a)}
            stroke={t.kev ? "var(--stamp)" : "var(--ink)"}
            strokeWidth={t.kev ? 2.2 : 1.4}
          />
        );
      })}
      <DialHand r={R - 4} />
      <circle cx="60" cy="60" r="2" fill="var(--ink)" />
    </svg>
  );
}
