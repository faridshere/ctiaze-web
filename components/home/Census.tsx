import type { ExposureRow } from "@/lib/exposure";

// The census as the markets page: a real table on the deeper stock, a product
// per row, the count in mono, the week's movement, and one shared log10 ruler
// so a 3,749-host product stays readable beside a 424,527-host one. The ruler
// is server-rendered SVG: labelled gridlines at 1k, 10k, 100k and 1M run the
// height of the table, each row draws a 1px ink bar to its count and a hollow
// tick at last week's. Honest by construction, zero client JS.
//
// One product name arrives from the pipeline in Azerbaijani (the channel's
// original language); the rest are vendor names. The notes are editorial.
const EN_NAME: Record<string, string> = {
  "RDP — ekran açıq": "RDP, exposed to the internet",
};

const NOTE: Record<string, string> = {
  "SonicWall SSL-VPN": "Akira's routine way in. Repeatedly on CISA KEV.",
  "FortiGate SSL-VPN": "FortiOS SSL-VPN. Persistent KEV entries, ransomware entry point.",
  "RDP — ekran açıq": "A desktop answering the open internet. Still the oldest way in.",
  "Palo Alto GlobalProtect": "Edge VPN portal. A 2024 KEV zero-day is still being found unpatched.",
  "MikroTik RouterOS": "Router fleets, widely conscripted into proxy and DDoS infrastructure.",
  "Microsoft Exchange": "On-premise mail. Years of KEV entries and no shortage of targets.",
  "Outlook Web (OWA)": "The login page in front of that mail.",
  "Zimbra Mail": "Repeatedly exploited in the wild against government mail.",
  "VMware ESXi": "Hypervisors. One host, every VM on it.",
};

const LOG_MIN = 3; // 1k
const LOG_MAX = 6; // 1M
const GRID = [3, 4, 5, 6];
const GRID_LABEL: Record<number, string> = { 3: "1k", 4: "10k", 5: "100k", 6: "1M" };

function xOf(v: number): number {
  if (v <= 0) return 0;
  return Math.min(1, Math.max(0, (Math.log10(v) - LOG_MIN) / (LOG_MAX - LOG_MIN)));
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function Delta({ now, before }: { now: number; before: number | null }) {
  if (before == null || before === 0) return <span className="num font-mono text-[11.5px] text-ink-3">—</span>;
  const d = now - before;
  if (d === 0) return <span className="num font-mono text-[11.5px] text-ink-3">no change</span>;
  const pct = Math.abs((d / before) * 100);
  // Up is worse here: more doors open than last week.
  return (
    <span className={`num font-mono text-[11.5px] ${d > 0 ? "text-worse" : "text-better"}`}>
      <span aria-hidden>{d > 0 ? "▲" : "▼"}</span>
      <span className="sr-only">{d > 0 ? "up" : "down"}</span> {fmt(Math.abs(d))}
      {pct >= 0.1 ? ` (${pct.toFixed(1)}%)` : ""}
    </span>
  );
}

const W = 240;
const H = 24;

function Ruler({ now, before, i }: { now: number; before: number | null; i: number }) {
  const x = xOf(now) * W;
  const xb = before ? xOf(before) * W : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-6 w-full" aria-hidden>
      {GRID.map((g) => {
        const gx = ((g - LOG_MIN) / (LOG_MAX - LOG_MIN)) * W;
        return <line key={g} x1={gx} y1="0" x2={gx} y2={H} stroke="var(--rule-soft)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
      })}
      <rect className="bar-draw" style={{ "--i": i } as React.CSSProperties} x="0" y={H / 2 - 1.5} width={Math.max(1, x)} height="3" fill="var(--ink)" />
      {xb !== null && (
        <rect x={Math.max(0, xb - 1)} y={H / 2 - 6} width="2" height="12" fill="none" stroke="var(--ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

function RulerHead() {
  return (
    <svg viewBox={`0 0 ${W} 14`} preserveAspectRatio="none" className="block h-3.5 w-full" aria-hidden>
      {GRID.map((g) => {
        const gx = ((g - LOG_MIN) / (LOG_MAX - LOG_MIN)) * W;
        return (
          <text key={g} x={g === LOG_MAX ? gx - 2 : gx + 3} y="11" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-3)" textAnchor={g === LOG_MAX ? "end" : "start"}>
            {GRID_LABEL[g]}
          </text>
        );
      })}
    </svg>
  );
}

export function Census({
  rows,
  measuredAt,
  previousAt,
}: {
  rows: ExposureRow[];
  measuredAt: string | null;
  previousAt: string | null;
}) {
  if (rows.length === 0) return null;
  const day = measuredAt ? measuredAt.slice(0, 10) : null;
  const prev = previousAt ? previousAt.slice(0, 10) : null;

  return (
    <section id="census" className="mt-[var(--sp-section)] border-y-2 border-ink bg-paper-deep" aria-labelledby="census-head">
      <div className="sheet py-8 sm:py-10">
        <div data-sc className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="census-head" className="headline text-[clamp(1.6rem,3vw,2.4rem)] text-ink">
            Exposure census
          </h2>
          <p className="label text-ink-3">
            What is open on the internet right now{day ? ` · measured worldwide ${day}` : ""}
            {prev ? ` · vs ${prev}` : ""}
          </p>
        </div>

        <div data-sc="2" className="mt-6">
          <table className="w-full border-collapse">
            <caption className="sr-only">Internet-exposed hosts per product, worldwide, with the change since the previous sweep, on a log scale</caption>
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="label pb-2 pr-4 text-left text-ink-3">Product</th>
                <th scope="col" className="label pb-2 pr-4 text-right text-ink-3">Exposed</th>
                <th scope="col" className="label pb-2 pr-4 text-right text-ink-3">Wk Δ</th>
                <th scope="col" className="label hidden pb-1 pr-4 text-left text-ink-3 md:table-cell">
                  <span className="sr-only">Scale, log base 10</span>
                  <RulerHead />
                </th>
                <th scope="col" className="label hidden pb-2 text-left text-ink-3 lg:table-cell">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const name = EN_NAME[r.name] ?? r.name;
                return (
                  <tr key={r.name} className="border-b border-rule-soft align-middle">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <span className="block text-[15px] leading-tight text-ink">{name}</span>
                      {NOTE[r.name] && <span className="mt-0.5 block text-[12px] leading-snug text-ink-3 lg:hidden">{NOTE[r.name]}</span>}
                    </th>
                    <td className="num py-3 pr-3 text-right font-mono text-[17px] leading-none text-ink sm:pr-4 sm:text-[20px]">{fmt(r.count)}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right">
                      <Delta now={r.count} before={r.previous} />
                    </td>
                    <td className="hidden w-[28%] min-w-[9rem] py-3 pr-4 md:table-cell">
                      <Ruler now={r.count} before={r.previous} i={i} />
                    </td>
                    <td className="hidden max-w-[22rem] py-3 text-[13px] leading-snug text-ink-2 lg:table-cell">{NOTE[r.name] ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="label mt-5 hidden flex-wrap items-center gap-x-5 gap-y-1 text-ink-3 md:flex">
          <span>Log scale</span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block h-[3px] w-5 bg-ink" /> this sweep
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-[3px] border border-ink" /> previous sweep
          </span>
          <span>▲ up = more doors open</span>
        </p>
        <p className="mt-4 max-w-[64ch] text-[13px] leading-relaxed text-ink-2">
          A scan count, not an inventory. This is how many hosts answered a probe from the public internet on the date
          shown: not how many are unpatched, not how many are vulnerable, and not how many are real (some are honeypots).
          It is a floor on the attack surface, and it is the number that moves when a vendor ships a patch nobody applies.
        </p>
      </div>
    </section>
  );
}
