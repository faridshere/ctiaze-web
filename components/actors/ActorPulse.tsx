import type { ActorActivity, ActorChange } from "@/lib/threatactors";
import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

// What this adversary has actually been doing lately, and what the tracker saw
// change. Both come from the engine's daily pass over `actor_events` — no LLM,
// no estimate, just counts of things that happened. Set as the dossier's index
// strip (three figures in ruled cells, like the front page's) and a dated
// ledger of changes beneath.
//
// Renders NOTHING when there is nothing to say. A strip reading "0 dispatches ·
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

function isoDay(at: unknown): string | null {
  if (typeof at !== "string") return null;
  const t = new Date(at);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

function Cell({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 py-4 pr-4 md:pl-4 md:first:pl-0">
      <span className="label text-ink-3">{n === 1 ? one : many}</span>
      <span className="num font-mono text-[2.25rem] leading-none text-ink md:text-[2.75rem]">{n.toLocaleString("en-US")}</span>
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
  const recent = (changes ?? []).filter((c) => c && c.kind && c.detail).slice(0, 6);
  const live = !!activity && (activity.stories > 0 || activity.victims > 0 || activity.cves_new > 0);
  if (!live && recent.length === 0) return null;

  const seen = ago(activity?.last_seen, renderedAt);
  const countries = (activity?.top_countries ?? []).slice(0, 5);
  const sectors = (activity?.top_sectors ?? []).slice(0, 5);

  return (
    <section className={DOSSIER_SECTION} aria-labelledby="pulse-head">
      {/* Without a live strip the ledger is the whole section, so it takes the
          section head itself rather than printing two label heads in a row. */}
      <SectionHead id="pulse-head" aside={live ? (seen ? `last seen ${seen}` : "tracked automatically, daily") : "ledger · newest first"}>
        {live ? "Last 30 days" : "What changed"}
      </SectionHead>

      {live && (
        <>
          <dl className="cells grid-cols-3">
            <Cell n={activity!.stories} one="dispatch" many="dispatches" />
            <Cell n={activity!.victims} one="victim" many="victims" />
            <Cell n={activity!.cves_new} one="CVE seen" many="CVEs seen" />
          </dl>
          <div className="rule-soft" />
        </>
      )}

      {/* "CVEs seen" counts every CVE that appeared in a dispatch naming this
          actor. The list further down the page is the smaller, evidence-gated
          set — the ones where a sentence actually ties the group to the flaw —
          so the two numbers differ on purpose and neither means "exploits". */}
      {(countries.length > 0 || sectors.length > 0) && (
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-[13.5px] leading-relaxed text-ink-2 sm:grid-cols-[auto_1fr]">
          {countries.length > 0 && (
            <>
              <dt className="label pt-1 text-ink-3">seen against</dt>
              <dd>{countries.join(" · ")}</dd>
            </>
          )}
          {sectors.length > 0 && (
            <>
              <dt className="label pt-1 text-ink-3">sectors</dt>
              <dd>{sectors.join(" · ")}</dd>
            </>
          )}
        </dl>
      )}

      {recent.length > 0 && (
        <div className={live ? "mt-8" : ""}>
          {live && (
            <div className="rule-b flex items-baseline justify-between pb-2">
              <h3 className="label text-ink">What changed</h3>
              <span className="label text-ink-3">ledger · newest first</span>
            </div>
          )}
          <ol>
            {recent.map((c, i) => {
              const day = isoDay(c.at);
              return (
                <li key={`${c.at}-${c.kind}-${i}`} className="row grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[9ch_8ch_auto_1fr]">
                  <span className="num font-mono text-[11.5px] text-ink">{day ?? "—"}</span>
                  <span className="num font-mono text-[11px] text-ink-3 sm:order-2">{ago(c.at, renderedAt) ?? ""}</span>
                  <span className="tag col-span-2 w-fit text-ink-3 sm:col-span-1 sm:order-3">{KIND_LABEL[c.kind] ?? c.kind}</span>
                  <span className="col-span-2 min-w-0 text-[14px] leading-snug text-ink-2 sm:col-span-1 sm:order-4">{c.detail}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
