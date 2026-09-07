import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import type { ActorActivity, ActorChange } from "@/lib/threatactors";

// What this adversary has actually been doing lately, and what the tracker saw
// change. Both come from the engine's daily pass over `actor_events` — no LLM,
// no estimate, just counts of things that happened.
//
// Renders NOTHING when there is nothing to say. A panel reading "0 dispatches ·
// 0 victims · 0 new CVEs" claims we looked and found silence, when usually it
// means the tracker has not reached this actor yet — and this site's whole
// argument is that it does not present absence as a finding.

const KIND_LABEL: Record<string, string> = {
  technique: "new technique",
  technique_new: "new technique",
  tool: "new tool",
  malware: "new malware",
  alias: "new alias",
  cve: "new CVE",
  report: "new report",
  victim: "new victims",
  wire: "back on the wire",
  reappearance: "back on the wire",
};

function ago(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.floor((now - t) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} d ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months} mo ago` : `${Math.round(days / 365)} y ago`;
}

function Stat({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold leading-none text-ink-primary tabular-nums">
        {n.toLocaleString("en-US")}
      </div>
      <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {n === 1 ? one : many}
      </div>
    </div>
  );
}

export function ActorPulse({
  activity,
  changes,
  renderedAt,
}: {
  activity: ActorActivity | null | undefined;
  changes: ActorChange[] | null | undefined;
  /** Fixed once per render so an hourly-cached page cannot claim two "ago"s. */
  renderedAt: number;
}) {
  const recent = (changes ?? []).slice(0, 6);
  const live = !!activity && (activity.stories > 0 || activity.victims > 0 || activity.cves_new > 0);
  if (!live && recent.length === 0) return null;

  const seen = ago(activity?.last_seen, renderedAt);
  const countries = (activity?.top_countries ?? []).slice(0, 5);
  const sectors = (activity?.top_sectors ?? []).slice(0, 5);

  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Panel limb className="p-6 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <Kicker live>Last 30 days</Kicker>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            {seen ? `last seen ${seen}` : "tracked automatically, daily"}
          </p>
        </div>

        {live && (
          <div className="mt-6 grid grid-cols-3 gap-6 sm:max-w-md">
            <Stat n={activity!.stories} one="dispatch" many="dispatches" />
            <Stat n={activity!.victims} one="victim" many="victims" />
            <Stat n={activity!.cves_new} one="CVE seen" many="CVEs seen" />
          </div>
        )}

        {/* "CVEs seen" counts every CVE that appeared in a dispatch naming this
            actor. The list further down the page is the smaller, evidence-gated
            set — the ones where a sentence actually ties the group to the flaw —
            so the two numbers differ on purpose and neither means "exploits". */}
        {(countries.length > 0 || sectors.length > 0) && (
          <div className="mt-6 space-y-2 text-[13px] leading-relaxed text-ink-secondary">
            {countries.length > 0 && (
              <p>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">seen against </span>
                {countries.join(" · ")}
              </p>
            )}
            {sectors.length > 0 && (
              <p>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">sectors </span>
                {sectors.join(" · ")}
              </p>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-7 border-t border-hairline pt-5">
            <Kicker>What changed</Kicker>
            <ul className="mt-4 space-y-2.5">
              {recent.map((c, i) => (
                <li key={`${c.at}-${c.kind}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-ink-muted">
                    {ago(c.at, renderedAt) ?? c.at.slice(0, 10)}
                  </span>
                  <span className="rounded-[var(--radius-chip)] border border-brand/40 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                    {KIND_LABEL[c.kind] ?? c.kind}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] leading-snug text-ink-secondary">{c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </section>
  );
}
