import Link from "next/link";
import type { ActorsPageData } from "@/lib/threatactors";
import { RelativeTime } from "./RelativeTime";

// The roster page of the paper: the dossier totals as a ledger on the left,
// and on the right the adversaries our own dispatches have named in the last
// 90 days, newest mention first. Every row prints in full: the name in the
// headline face (it presses harder into the paper on hover), what the sources
// state about it, and the latest dispatch that named it.
const TYPE_WORD: Record<string, string> = { "nation-state": "Nation-state", crime: "Crime" };

export function Roster({ data }: { data: ActorsPageData }) {
  const rows = data.onTheWire.slice(0, 8);
  const s = data.stats;
  const head = [
    { n: s.total, label: "dossiers" },
    { n: s.nationState, label: "state-sponsored" },
    { n: s.crime, label: "crime crews" },
    { n: s.withTtps, label: "with ATT&CK data" },
    { n: s.onWire90d, label: "named on the wire, 90 days" },
  ];
  return (
    <section className="sheet pt-[var(--sp-section)]" aria-labelledby="roster-head">
      <div className="rule-2" />
      <div className="grid gap-10 pt-6 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-4 md:pr-6">
          <h2 id="roster-head" className="headline text-[clamp(1.75rem,3.2vw,2.6rem)] text-ink">
            Adversaries.
          </h2>
          <dl className="mt-6 divide-y divide-rule-soft border-y border-rule-soft">
            {head.map((h) => (
              <div key={h.label} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="label text-ink-3">{h.label}</dt>
                <dd className="num font-mono text-[15px] text-ink">{h.n.toLocaleString("en-US")}</dd>
              </div>
            ))}
          </dl>
          {s.lastRefreshed && <p className="label mt-3 text-ink-3">Roster refreshed {s.lastRefreshed.slice(0, 10)}</p>}
          <p className="mt-6 max-w-[34ch] text-[14px] leading-relaxed text-ink-2">
            Every field is what a source states: MISP galaxy, MITRE ATT&amp;CK, ransomware leak sites, APTnotes. Assessed origin, observed targets, techniques by tactic, with the report that says so.
          </p>
          <Link href="/actors" className="label ulink mt-5 inline-block text-ink">
            All {s.total.toLocaleString("en-US")} dossiers →
          </Link>
        </div>

        <div className="md:col-span-8 md:border-l md:border-rule-soft md:pl-6">
          <div className="rule-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
            <h3 className="label flex items-center gap-2 text-ink">
              <span aria-hidden className="live-dot" />
              On the wire · last 90 days
            </h3>
            <span className="label text-ink-3">{data.onTheWire.length} adversaries named in our dispatches</span>
          </div>
          {rows.length > 0 ? (
            <ol>
              {rows.map((a) => {
                const latest = a.mentions[0] ?? null;
                const stated = [TYPE_WORD[a.type] ?? null, a.originLabel ? `assessed origin ${a.originLabel}` : null].filter(Boolean).join(" · ");
                return (
                  <li key={a.id} className="row py-3" data-sev={latest?.kev ? "kev" : undefined}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <Link href={`/actors/${a.id}`} className="min-w-0">
                        <span className="pressed text-[22px] leading-tight text-ink sm:text-[24px]">{a.name}</span>
                      </Link>
                      <span className="num font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                        {a.wire} dispatch{a.wire === 1 ? "" : "es"} · last <RelativeTime iso={a.lastMention} />
                      </span>
                    </div>
                    {stated && <p className="label mt-1 text-ink-3">{stated}</p>}
                    {latest && (
                      <Link href={`/news/${latest.slug}`} className="mt-1.5 block text-[13.5px] leading-snug text-ink-2 hover:text-ink hover:underline">
                        {latest.kev && <span className="stamp mr-2 align-middle">KEV</span>}
                        {latest.title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="label py-6 text-ink-3">No adversary named in the last 90 days.</p>
          )}
        </div>
      </div>
    </section>
  );
}
