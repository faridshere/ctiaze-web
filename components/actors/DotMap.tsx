import { COUNTRIES } from "@/lib/geo";
import { LAND_ROWS, LAND_W, LAND_H } from "@/lib/data/landmask";

// The targeting map: the world as a dotted land mask, the assessed origin as
// one orange node with a slow ping, every observed target country as a cyan
// node. Server-rendered SVG. Each row of land is one dashed stroke (round caps
// + a 0/1 dash make dots), so the whole world is a few hundred elements, not
// seven thousand circles. Cropped to 84°N…56°S: no Antarctic block, no Arctic
// ice read as land.
const LAT_TOP = 84, LAT_BOTTOM = -56;
const rowOf = (lat: number) => ((90 - lat) / 180) * LAND_H;
const colOf = (lon: number) => ((lon + 180) / 360) * LAND_W;
const ROW0 = Math.floor(rowOf(LAT_TOP)), ROW1 = Math.ceil(rowOf(LAT_BOTTOM));

function landRuns(): { y: number; x: number; len: number }[] {
  const runs: { y: number; x: number; len: number }[] = [];
  for (let y = ROW0; y < ROW1; y++) {
    const row = LAND_ROWS[y];
    let x = 0;
    while (x < LAND_W) {
      if (row[x] !== "1") { x++; continue; }
      let len = 1;
      while (x + len < LAND_W && row[x + len] === "1") len++;
      runs.push({ y, x, len });
      x += len;
    }
  }
  return runs;
}
const RUNS = landRuns();

export function DotMap({
  origin,
  targets,
  className = "",
}: {
  origin: string | null;
  targets: string[];
  className?: string;
}) {
  const H = ROW1 - ROW0;
  const pt = (iso: string) => {
    const c = COUNTRIES[iso];
    if (!c) return null;
    return { x: colOf(c.lon) + 0.5, y: rowOf(c.lat) - ROW0 + 0.5, name: c.name };
  };
  const o = origin ? pt(origin) : null;
  const ts = targets.map(pt).filter((p): p is NonNullable<typeof p> => p !== null);
  return (
    <svg
      viewBox={`0 ${-0.5} ${LAND_W} ${H + 1}`}
      className={className}
      role="img"
      aria-label={`Targeting map: ${o ? `assessed origin ${o.name}; ` : ""}${ts.length} observed target countries`}
    >
      <g stroke="var(--ink-muted)" strokeOpacity="0.28" strokeWidth="0.62" strokeLinecap="round" strokeDasharray="0 1" fill="none">
        {RUNS.map((r, i) => (
          <path key={i} d={`M${r.x + 0.5} ${r.y - ROW0 + 0.5}h${r.len - 1}`} />
        ))}
      </g>
      {ts.map((p, i) => (
        <g key={`t${i}`} className="map-target" style={{ "--i": i } as React.CSSProperties}>
          <circle cx={p.x} cy={p.y} r="2.2" fill="var(--limb)" fillOpacity="0.14" />
          <circle cx={p.x} cy={p.y} r="0.9" fill="var(--limb)">
            <title>{p.name}</title>
          </circle>
        </g>
      ))}
      {o && (
        <g>
          <circle cx={o.x} cy={o.y} r="1.2" className="map-ping" fill="none" stroke="var(--brand)" strokeWidth="0.35" />
          <circle cx={o.x} cy={o.y} r="1.25" fill="var(--brand)">
            <title>{`Assessed origin: ${o.name}`}</title>
          </circle>
        </g>
      )}
    </svg>
  );
}
