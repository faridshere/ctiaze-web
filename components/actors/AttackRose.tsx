import type { ThreatActor, Ttp } from "@/lib/threatactors";
import { actorInitials } from "@/lib/threatactors";

/**
 * Attack rose — the actor's emblem, drawn server-side from its REAL ATT&CK
 * techniques (nothing invented): the fifteen Enterprise tactics as spokes in
 * kill-chain order, a coverage silhouette whose reach on each spoke scales
 * with technique count, and one dot per technique.
 *
 * Inked for the paper: the grid in the soft rule, the silhouette stroked in
 * ink and washed in the stamp red at low opacity, the dots in ink. The var()
 * tokens resolve inside SVG presentation attributes in every browser we
 * serve, so the rose follows the edition like any other rule on the page.
 */

const ORDER = [
  "reconnaissance",
  "resource-development",
  "initial-access",
  "execution",
  "persistence",
  "privilege-escalation",
  "stealth",
  "defense-impairment",
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
    <svg viewBox={`0 0 ${S} ${S}`} className={className} role="img" aria-label={label}>
      <title>{label}</title>
      {/* ring grid */}
      {[R_OUT, 70, 44].map((r) => (
        <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="var(--rule-soft)" strokeWidth="1" />
      ))}
      {/* tactic spokes */}
      {ORDER.map((_, i) => {
        const a = angle(i);
        return (
          <line key={i} x1={px(a, 16)} y1={py(a, 16)} x2={px(a, R_OUT)} y2={py(a, R_OUT)} stroke="var(--rule-soft)" strokeWidth="1" />
        );
      })}
      {/* coverage silhouette from real technique counts */}
      {total > 0 ? (
        <path d={`M ${silhouette} Z`} fill="var(--stamp)" fillOpacity="0.12" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
      ) : null}
      {/* one dot per technique along its tactic spoke */}
      {ORDER.flatMap((_, i) => {
        const a = angle(i);
        return Array.from({ length: Math.min(counts[i], MAXN) }, (_, k) => (
          <circle
            key={`${i}-${k}`}
            cx={px(a, R_MIN + (k + 1) * STEP - STEP / 2)}
            cy={py(a, R_MIN + (k + 1) * STEP - STEP / 2)}
            r="1.9"
            fill="var(--ink)"
          />
        ));
      })}
      {/* centre seal */}
      <circle cx={C} cy={C} r="15" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
      <text
        x={C}
        y={C + 4}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
        fontSize="11"
        fontWeight="500"
        fill="var(--ink)"
      >
        {actorInitials(actor.name)}
      </text>
    </svg>
  );
}
