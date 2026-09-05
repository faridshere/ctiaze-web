import Link from "next/link";
import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import { flagEmoji } from "@/lib/geo";
import type { OriginGroup } from "@/lib/threatactors";

// Ten countries the roster assesses the most adversaries to, as a horizontal
// strip of interactive panels rather than a table — each one a real filter
// link (?origin=ISO), read by ActorSearch on mount so a click here lands the
// visitor already scrolled to a filtered search, not just a highlighted card.
export function OriginStrip({ origins }: { origins: OriginGroup[] }) {
  if (origins.length === 0) return null;
  return (
    <section data-sc className="mt-16">
      <Kicker>By assessed origin</Kicker>
      <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {origins.map((o) => (
          <Link key={o.iso} href={`/actors?origin=${o.iso}`} className="block w-56 shrink-0">
            <Panel interactive className="flex h-full flex-col p-5">
              <span className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-secondary">
                <span aria-hidden>{flagEmoji(o.iso)}</span>
                {o.name}
              </span>
              <span className="mt-3 font-display text-[2.4rem] font-semibold leading-none tracking-[-0.03em] text-ink-primary">
                {o.count}
              </span>
              {o.lead.length > 0 && (
                <span className="mt-3 truncate font-mono text-[11px] text-ink-muted" title={o.lead.join(", ")}>
                  lead: {o.lead.join(", ")}
                </span>
              )}
            </Panel>
          </Link>
        ))}
      </div>
    </section>
  );
}
