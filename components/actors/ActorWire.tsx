import Link from "next/link";
import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import type { WireMention } from "@/lib/actor-wire";

const MAX_ROWS = 10;

// This actor's own real mentions on skopnix's wire (lib/actor-wire's precise
// name/alias matcher over the last few hundred dispatches) — newest first, so
// a visitor sees whether the wire has actually talked about this actor, not a
// vague "recent activity" claim.
export function ActorWire({ mentions }: { mentions: WireMention[] }) {
  if (mentions.length === 0) return null;
  const rows = mentions.slice(0, MAX_ROWS);

  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Kicker live>On the wire</Kicker>
      <Panel className="mt-5">
        <ol>
          {rows.map((m, i) => (
            <li key={`${m.slug}-${i}`} className="border-b border-hairline last:border-b-0">
              <Link
                href={`/news/${m.slug}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-hover sm:px-6"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] leading-snug text-ink-primary/90 transition-colors group-hover:text-ink-primary">
                  {m.title}
                </span>
                {m.kev && (
                  <span className="shrink-0 rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-mono text-[10px] font-semibold uppercase text-surface">
                    KEV
                  </span>
                )}
                <time dateTime={m.at} className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">
                  {m.at.slice(0, 10)}
                </time>
              </Link>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  );
}
