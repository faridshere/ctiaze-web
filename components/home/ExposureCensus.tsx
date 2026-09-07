import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import type { ExposureRow } from "@/lib/exposure";

// What the internet is leaving open, measured rather than asserted.
//
// The engine sweeps a fixed watchlist of internet-facing products every week
// and records how many hosts answer worldwide. These are the doors ransomware
// crews actually walk through — edge VPNs, exposed RDP, mail servers — so the
// counts are the closest thing this site has to a number an operator can act on.
//
// One product name arrives from the pipeline in Azerbaijani (the channel's
// original language); the rest are vendor names that need no translation. The
// notes are written here because they are editorial, not measured.
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

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function Delta({ now, before }: { now: number; before: number | null }) {
  if (before == null || before === 0) return null;
  const d = now - before;
  if (d === 0) return <span className="font-mono text-[11px] text-ink-muted">no change</span>;
  const pct = Math.abs((d / before) * 100);
  // Up is worse here: more doors open than last week.
  return (
    <span className={`font-mono text-[11px] ${d > 0 ? "text-accent-critical" : "text-accent-good"}`}>
      {d > 0 ? "▲" : "▼"} {fmt(Math.abs(d))} {pct >= 0.1 ? `(${pct.toFixed(1)}%)` : ""}
    </span>
  );
}

export function ExposureCensus({
  rows,
  measuredAt,
  previousAt,
}: {
  rows: ExposureRow[];
  measuredAt: string | null;
  previousAt: string | null;
}) {
  if (rows.length === 0) return null;
  const max = rows[0].count || 1;
  const day = measuredAt ? measuredAt.slice(0, 10) : null;

  return (
    <Panel limb className="p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <Kicker live>The census · what is open right now</Kicker>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          {day ? `measured worldwide ${day}` : "measured worldwide"}
          {previousAt ? ` · vs ${previousAt.slice(0, 10)}` : ""}
        </p>
      </div>

      <ul className="mt-6 space-y-3.5">
        {rows.map((r) => {
          const name = EN_NAME[r.name] ?? r.name;
          return (
            <li key={r.name}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[15px] text-ink-primary">{name}</span>
                <span className="flex items-baseline gap-3">
                  <Delta now={r.count} before={r.previous} />
                  <span className="font-mono text-[15px] tabular-nums text-ink-primary">{fmt(r.count)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-brand/70"
                  style={{ width: `${Math.max(1.5, (r.count / max) * 100)}%` }}
                />
              </div>
              {NOTE[r.name] && (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{NOTE[r.name]}</p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-7 max-w-[46rem] border-t border-hairline pt-5 text-[13px] leading-relaxed text-ink-secondary">
        A scan count, not an inventory. This is how many hosts answered a probe from the public internet on the date
        shown — not how many are unpatched, not how many are vulnerable, and not how many are real (some are
        honeypots). It is a floor on the attack surface, and it is the number that moves when a vendor ships a
        patch nobody applies.
      </p>
    </Panel>
  );
}
