import Link from "next/link";
import { NO_TARGET, type AzBoard } from "@/lib/az-shape";
import { AsOf } from "./AsOf";

// The regional desk on page one (2026-10-17): the Azerbaijan board and the
// claims ledger in one ruled module, read from the same cached board /az
// prints (lib/az.ts, five-minute cache with a last-good file). Every row is a
// CLAIM someone else made, said so, with our own reachability check beside it.
// A section that could not be read prints "not readable", never a zero.
const VERDICT_TONE: Record<string, string> = { up: "text-better", filtered: "text-caution", unreachable: "text-worse", unchecked: "text-ink-3" };

function utcDay(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)} ${iso.slice(11, 16)}`;
}

export function RegionalDesk({ board, refIso }: { board: AzBoard; refIso: string }) {
  const rows = board.campaigns.ok ? board.campaigns.rows.slice(0, 4) : [];
  // Only the uncapped count: campaign rows stop at the board's 40, and the
  // adversary and exploit sections stay on /az until they are populated.
  const figures = [{ label: "Claims · 7 days", value: board.campaigns.ok ? board.claims7d : null }];
  return (
    <section className="sheet pt-[var(--sp-section)]" aria-labelledby="regional-head" data-regional-desk>
      <div className="rule-2" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-5">
        <h2 id="regional-head" className="headline text-[clamp(1.6rem,3vw,2.4rem)] text-ink">
          Regional desk: Azerbaijan.
        </h2>
        <AsOf iso={board.generatedAt} refIso={refIso} />
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-4 md:pr-6">
          <dl className="divide-y divide-rule-soft border-y border-rule-soft">
            {figures.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="label text-ink-3">{f.label}</dt>
                <dd className="num font-mono text-[15px] text-ink">{f.value === null ? <span className="text-ink-3">not readable</span> : f.value.toLocaleString("en-US")}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-ink-2">
            Hacktivist and leak-site claims against Azerbaijan, each checked from our side. A claim is what someone posted, not a confirmed incident.
          </p>
          <p className="label mt-4 flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/az" className="ulink text-ink">
              The Azerbaijan board →
            </Link>
            <Link href="/claims" className="ulink text-ink">
              Claims vs reality →
            </Link>
          </p>
        </div>
        <div className="min-w-0 md:col-span-8 md:border-l md:border-rule-soft md:pl-6">
          <h3 className="label rule-b pb-2 text-ink">Newest claims · claimant, target, our check</h3>
          {rows.length > 0 ? (
            <ol>
              {rows.map((c) => (
                <li key={`${c.group}|${c.target}`} className="row grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 py-3" data-sev={c.verdict === "unreachable" ? "high" : undefined}>
                  <span className="min-w-0 text-[14px] leading-snug text-ink [overflow-wrap:anywhere]">
                    <span className="label text-ink">{c.group}</span>{" "}
                    <span className="text-ink-3">claims</span> {c.claimTypes[0] ?? "an attack"}{" "}
                    <span className="text-ink-3">on</span> {c.target === NO_TARGET ? <span className="text-ink-3">{NO_TARGET}</span> : c.target}
                  </span>
                  <span className="num whitespace-nowrap font-mono text-[11px] text-ink-3">{utcDay(c.last)} UTC</span>
                  <span className="col-span-2 font-mono text-[11px] text-ink-3">
                    our check: <span className={VERDICT_TONE[c.verdict]}>{c.verdict === "unchecked" ? "not checked" : c.verdict}</span>
                    {c.claims > 1 && ` · ${c.claims} claims`}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="label py-6 text-ink-3">{board.campaigns.ok ? "No claims against Azerbaijan in the last 7 days." : "The claims watch could not be read just now."}</p>
          )}
        </div>
      </div>
    </section>
  );
}
