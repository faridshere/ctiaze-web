import type { ThreatActor } from "@/lib/_disabled/threatactors";

// The sigil only needs identity, type and documented depth — accept that
// structural subset so lean teasers can render it without full dossiers.
export type SigilSeed = { _id: string; type: string; techniques?: readonly unknown[] | null };

// Every actor gets its own motion signature: a small sensor-constellation seeded
// deterministically from the actor's id and real data — spoke count from its
// documented ATT&CK depth, hue from its type, a signal pulse traveling each
// spoke (CSS offset-path; the global reduced-motion kill silences it). Pure
// server-rendered SVG — no client JS, no hydration surface, unique per actor.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const TYPE_STROKE: Record<string, string> = {
  "nation-state": "#FF5A4D",
  crime: "#F6B44A",
};

export function ActorSigil({ a, size = 40 }: { a: SigilSeed; size?: number }) {
  const seed = hash(a._id);
  const spokes = 3 + (Math.min(a.techniques?.length ?? 0, 9) > 0 ? Math.min(2 + Math.floor((a.techniques!.length - 1) / 4), 3) : (seed % 2)); // 3–6, data-driven
  const rot = (seed % 360);
  const accent = TYPE_STROKE[a.type] ?? "#6FD3E6";
  const cx = 20, cy = 20, r = 13;
  const pts = Array.from({ length: spokes }, (_, i) => {
    const jitter = ((hash(a._id + i) % 100) / 100 - 0.5) * (360 / spokes) * 0.45;
    const ang = ((rot + (360 / spokes) * i + jitter) * Math.PI) / 180;
    const rr = r * (0.82 + ((hash(a._id + "r" + i) % 100) / 100) * 0.18);
    return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)] as const;
  });
  const dur = 2.6 + ((seed >> 4) % 14) / 10; // 2.6–4.0s, per-actor cadence
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="shrink-0">
      <g stroke="currentColor" strokeWidth="1.1" opacity="0.5">
        {pts.map(([x, y], i) => (<path key={i} d={`M${cx} ${cy} L${x.toFixed(1)} ${y.toFixed(1)}`} />))}
      </g>
      <circle cx={cx} cy={cy} r="2.4" fill="currentColor" opacity="0.9" />
      {pts.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={i === 0 ? 2.6 : 2.1} fill={i === 0 ? accent : "currentColor"} opacity={i === 0 ? 1 : 0.75} />
      ))}
      {pts.map(([x, y], i) => (
        <circle
          key={`p${i}`}
          r="1.3"
          fill={accent}
          className="sigil-pulse"
          style={{
            offsetPath: `path("M${cx} ${cy} L${x.toFixed(1)} ${y.toFixed(1)}")`,
            animationDuration: `${dur}s`,
            animationDelay: `${((i * dur) / spokes).toFixed(2)}s`,
          }}
        />
      ))}
    </svg>
  );
}

// "Live" when the actor has observable recent activity (leak-site victims or
// feed items) inside ~90 days — honest, computed from the data we actually hold.
export function actorIsLive(a: ThreatActor, nowMs: number): boolean {
  const cutoff = nowMs - 90 * 24 * 3600_000;
  const la = a.last_active ? new Date(a.last_active).getTime() : 0;
  const ra = (a.recent_activity ?? [])
    .map((x) => (x.date ? new Date(x.date).getTime() : 0))
    .reduce((m, t) => Math.max(m, t), 0);
  return Math.max(la, ra) > cutoff;
}
