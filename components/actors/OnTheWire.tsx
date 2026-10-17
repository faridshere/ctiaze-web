import Link from "next/link";
import { ActorSigil } from "@/components/actors/ActorSigil";
import { RelativeTime } from "@/components/home/RelativeTime";
import type { ActorRow } from "@/lib/threatactors";
import type { WireMention } from "@/lib/actor-wire";

const TYPE_WORD: Record<string, string> = { "nation-state": "State-sponsored", crime: "Crime" };

export type OnTheWireRow = ActorRow & { lastMention: string; mentions: WireMention[] };

// The sigil is a one-ink mark on this page. ActorSigil (the dossier's file)
// colours its accent node by type — stamp red for a nation-state — and the
// paper reserves that red for KEV; type is already printed on the label line.
// Overriding the two variables the sigil reads, on its wrapper only, keeps it
// in the third ink without touching the shared component.
const SIGIL_ONE_INK = { "--stamp": "currentColor", "--ink-2": "currentColor" } as React.CSSProperties;

// The site's own signal, not the weekly ETL's stale join (see lib/actor-wire.ts):
// which adversaries our dispatches have actually named in the last 90 days,
// as ruled rows. The name is pressed into the paper, type and assessed origin
// are labels, the latest dispatch is an underlined link, the count is mono.
// A row whose latest mention is actively exploited carries the double stamp
// rule. Renders nothing when the wire has named no one: an honest empty.
// It is a 90-day roll-up computed at build, not a live feed, so no live dot.
export function OnTheWire({ rows }: { rows: OnTheWireRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="otw-head">
      <div className="rule-2" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-5">
        <h2 id="otw-head" className="headline text-[clamp(1.6rem,3vw,2.4rem)] text-ink">
          On the wire
        </h2>
        <p className="label text-ink-3">
          last 90 days · <span className="num font-mono tracking-normal">{rows.length}</span> adversaries named in our dispatches
        </p>
      </div>
      <ol className="mt-5 border-t border-ink">
        {rows.map((a, i) => {
          const latest = a.mentions[0] ?? null;
          const typeWord = TYPE_WORD[a.type] ?? null;
          return (
            <li
              key={a.id}
              className="row wire-row"
              data-sev={latest?.kev ? "kev" : undefined}
              style={{ "--i": i } as React.CSSProperties}
            >
              {/* The meta column is a fixed track on md+ so every headline link
                  down the list starts at the same x, whatever the count's width. */}
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-3 md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_19rem] md:items-baseline md:gap-x-4">
                <span className="mt-1 shrink-0 text-ink-3 md:mt-0 md:self-start" aria-hidden style={SIGIL_ONE_INK}>
                  <ActorSigil
                    a={{ _id: a.id, type: a.type, techniques: Array.from({ length: Math.min(a.techniqueCount, 9) }) }}
                    size={22}
                  />
                </span>
                <span className="min-w-0">
                  <Link href={`/actors/${a.id}`} className="block min-w-0">
                    <span className="pressed block truncate text-[22px] leading-tight text-ink md:text-[24px]">{a.name}</span>
                  </Link>
                  {(typeWord || a.originLabel) && (
                    <span className="label mt-1 block text-ink-3">
                      {typeWord}
                      {typeWord && a.originLabel ? " · " : ""}
                      {a.originLabel ? `assessed origin ${a.originLabel}` : ""}
                    </span>
                  )}
                </span>
                {latest ? (
                  <Link
                    href={`/news/${latest.slug}`}
                    className="ulink col-start-2 mt-2 line-clamp-2 min-w-0 text-[13.5px] leading-snug text-ink-2 hover:text-ink md:col-start-auto md:mt-0"
                  >
                    {latest.kev && <span className="stamp mr-2 align-[2px]">KEV</span>}
                    {latest.title}
                  </Link>
                ) : (
                  <span className="hidden md:block" />
                )}
                <span className="label col-start-2 mt-1.5 block text-ink-3 md:col-start-auto md:mt-0 md:whitespace-nowrap md:text-right">
                  <span className="num font-mono tracking-normal">{a.wire}</span> dispatch{a.wire === 1 ? "" : "es"} · last{" "}
                  <span className="num font-mono tracking-normal">
                    <RelativeTime iso={a.lastMention} />
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
