import Link from "next/link";
import { ActorSigil } from "@/components/actors/ActorSigil";
import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import type { ActorRow } from "@/lib/threatactors";
import type { WireMention } from "@/lib/actor-wire";

const TYPE_INK: Record<string, string> = {
  "nation-state": "text-accent-critical",
  crime: "text-accent-warning",
};

export type OnTheWireRow = ActorRow & { lastMention: string; mentions: WireMention[] };

// Fixed once when this lambda/build warmed, not re-read per render — calling
// Date.now() inside a component body would trip the purity lint and would
// redraw a different "ago" on every request of an hourly-cached page anyway.
const RENDER_EPOCH = Date.now();

function agoFromEpoch(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((RENDER_EPOCH - t) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

// The site's own signal, not the weekly ETL's stale join (see lib/actor-wire.ts):
// which adversaries our dispatches have actually named recently, and what we
// said. Renders nothing when the wire hasn't named anyone — an honest empty.
export function OnTheWire({ rows }: { rows: OnTheWireRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Panel limb className="p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <Kicker live>On the wire · last 90 days</Kicker>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          {rows.length} adversaries named in our dispatches
        </p>
      </div>
      <ul className="mt-5 divide-y divide-hairline">
        {rows.map((a, i) => {
          const latest = a.mentions[0] ?? null;
          return (
            <li
              key={a.id}
              className="wire-row flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-hairline bg-surface text-ink-secondary">
                <ActorSigil
                  a={{ _id: a.id, type: a.type, techniques: Array.from({ length: Math.min(a.techniqueCount, 9) }) }}
                  size={30}
                />
              </span>
              <span className="min-w-[11rem] flex-1">
                <Link
                  href={`/actors/${a.id}`}
                  className="font-display text-[15px] font-semibold text-ink-primary transition-colors hover:text-brand"
                >
                  {a.name}
                </Link>
                {a.type !== "unknown" && (
                  <span className={`ml-2 font-mono text-[10px] uppercase tracking-[0.1em] ${TYPE_INK[a.type] ?? "text-ink-muted"}`}>
                    {a.type}
                  </span>
                )}
                <span className="block font-mono text-[11px] text-ink-muted">
                  {a.wire} dispatch{a.wire === 1 ? "" : "es"} · last {agoFromEpoch(a.lastMention)}
                </span>
              </span>
              {latest && (
                <Link
                  href={`/news/${latest.slug}`}
                  className="flex min-w-0 flex-[2] basis-[18rem] items-center gap-2 text-[13px] sm:justify-end text-ink-secondary transition-colors hover:text-brand"
                >
                  {latest.kev && (
                    <span className="shrink-0 rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-mono text-[10px] font-semibold uppercase text-surface">
                      KEV
                    </span>
                  )}
                  <span className="truncate">{latest.title}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
