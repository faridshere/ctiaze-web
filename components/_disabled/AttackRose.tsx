import type { ThreatActor, Ttp } from "@/lib/_disabled/threatactors";
import { actorInitials } from "@/lib/_disabled/threatactors";

/**
 * Attack-rose — the actor's signature generative emblem, drawn server-side
 * from its REAL ATT&CK techniques (nothing invented): 14 tactic spokes in
 * kill-chain order, a coverage silhouette whose reach on each spoke scales
 * with technique count, one dot per technique, and a slow radar sweep
 * (transform-origin pinned to the view-box centre — the CSS/SVG default is
 * the top-left corner, which orbits instead of spins).
 *
 * Colours are literal dark-register hex on purpose: var() does not resolve
 * inside SVG presentation attributes, and the screen identity is always the
 * dark ink register (light is print-only).
 */

const ORDER = [
  "reconnaissance",
  "resource-development",
  "initial-access",
  "execution",
  "persistence",
  "privilege-escalation",
  "defense-evasion",
  "credential-access",
  "discovery",
  "lateral-movement",
  "collection",
  "command-and-control",
  "exfiltration",
  "impact",
] as const;

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[_\s]+/g, "-").trim();

function inkFor(type: string): { line: string; fill: string } {
  if (type === "nation-state") return { line: "#ff4d5e", fill: "rgba(255,77,94,0.14)" };
  if (type === "crime" || type === "ransomware" || type === "cybercrime")
    return { line: "#e0729a", fill: "rgba(224,114,154,0.14)" };
  return { line: "#57b6a6", fill: "rgba(87,182,166,0.14)" };
}

export function AttackRose({
  actor,
  className,
  title,
}: {
  actor: Pick<ThreatActor, "name" | "type"> & { techniques?: Ttp[] };
  className?: string;
  title?: string;
}) {
  const S = 220;
  const C = S / 2;
  const R_OUT = 96; // outer ring
  const R_MIN = 26; // silhouette floor
  const STEP = 11; // px per technique on a spoke
  const MAXN = 6;

  const counts = new Array(ORDER.length).fill(0) as number[];
  for (const t of actor.techniques ?? []) {
    const i = ORDER.indexOf(norm(t.tactic) as (typeof ORDER)[number]);
    if (i >= 0) counts[i] += 1;
  }
  const total = counts.reduce((a, b) => a + b, 0);
  const ink = inkFor(actor.type);

  const angle = (i: number) => (i / ORDER.length) * Math.PI * 2 - Math.PI / 2;
  const px = (a: number, r: number) => C + Math.cos(a) * r;
  const py = (a: number, r: number) => C + Math.sin(a) * r;

  const silhouette = ORDER.map((_, i) => {
    const r = R_MIN + Math.min(counts[i], MAXN) * STEP;
    const a = angle(i);
    return `${px(a, r).toFixed(1)} ${py(a, r).toFixed(1)}`;
  }).join(" L ");

  const label = title ?? `${actor.name} — ATT&CK rose`;

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {/* ring grid */}
      {[R_OUT, 70, 44].map((r) => (
        <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="#23262e" strokeWidth="1" />
      ))}
      {/* tactic spokes */}
      {ORDER.map((_, i) => {
        const a = angle(i);
        return (
          <line
            key={i}
            x1={px(a, 16)}
            y1={py(a, 16)}
            x2={px(a, R_OUT)}
            y2={py(a, R_OUT)}
            stroke="#181a20"
            strokeWidth="1"
          />
        );
      })}
      {/* radar sweep — pinned origin, slow spin */}
      <g className="rsweep">
        <path
          d={`M${C} ${C} L${C} ${C - R_OUT} A${R_OUT} ${R_OUT} 0 0 1 ${px(angle(0) + 0.55, R_OUT).toFixed(1)} ${py(
            angle(0) + 0.55,
            R_OUT,
          ).toFixed(1)} Z`}
          fill="rgba(255,90,31,0.10)"
        />
        <line x1={C} y1={C} x2={C} y2={C - R_OUT} stroke="#ff5a1f" strokeWidth="1.2" opacity="0.8" />
      </g>
      {/* coverage silhouette from real technique counts */}
      {total > 0 ? (
        <path d={`M ${silhouette} Z`} fill={ink.fill} stroke={ink.line} strokeWidth="1.6" strokeLinejoin="round" />
      ) : null}
      {/* one dot per technique along its tactic spoke */}
      {ORDER.flatMap((_, i) => {
        const a = angle(i);
        return Array.from({ length: Math.min(counts[i], MAXN) }, (_, k) => (
          <circle
            key={`${i}-${k}`}
            cx={px(a, R_MIN + (k + 1) * STEP - STEP / 2)}
            cy={py(a, R_MIN + (k + 1) * STEP - STEP / 2)}
            r="2"
            fill={ink.line}
            opacity="0.9"
          />
        ));
      })}
      {/* centre seal */}
      <circle cx={C} cy={C} r="15" fill="#0a0b0d" stroke="#23262e" strokeWidth="1" />
      <text
        x={C}
        y={C + 4}
        textAnchor="middle"
        // var() resolves in CSS properties, not presentation attributes — same
        // rule as the fill colors above, so the font goes via style.
        style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
        fontSize="11"
        fontWeight="700"
        fill="#f2efe9"
      >
        {actorInitials(actor.name)}
      </text>
    </svg>
  );
}
