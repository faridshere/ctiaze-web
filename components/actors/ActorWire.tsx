import { LocalTime } from "@/components/site/LocalTime";
import Link from "next/link";
import type { WireMention } from "@/lib/actor-wire";
import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

const MAX_ROWS = 10;

// This actor's own real mentions on skopnix's wire (lib/actor-wire's precise
// name/alias matcher over the last few hundred dispatches) — newest first, as
// ruled rows whose bottom rule carries the severity (the double stamp rule
// for anything actively exploited), so a visitor sees whether the wire has
// actually talked about this actor, not a vague "recent activity" claim.
export function ActorWire({ mentions }: { mentions: WireMention[] }) {
  if (mentions.length === 0) return null;
  const rows = mentions.slice(0, MAX_ROWS);

  return (
    <section className={DOSSIER_SECTION} aria-labelledby="wire-head">
      <SectionHead id="wire-head" aside={`${mentions.length} dispatch${mentions.length === 1 ? "" : "es"} · newest first`}>
        On the wire
      </SectionHead>
      <ol>
        {rows.map((m, i) => (
          <li key={`${m.slug}-${i}`} className="row" data-sev={m.kev ? "kev" : undefined}>
            <Link href={`/news/${m.slug}`} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-3">
              <LocalTime iso={m.at} shape="date" className="num font-mono text-[11px] text-ink-3" fallback={m.at.slice(0, 10)} />
              <span className="line-clamp-2 min-w-0 text-[14px] leading-[1.3] text-ink underline-offset-[3px] group-hover:underline">{m.title}</span>
              <span className="flex items-center">{m.kev && <span className="stamp">KEV</span>}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
