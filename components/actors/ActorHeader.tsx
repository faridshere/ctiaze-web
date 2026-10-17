import { tacticCount as countTactics } from "@/lib/attack";
import Link from "next/link";
import { AttackRose } from "@/components/actors/AttackRose";
import { ActorSigil } from "@/components/actors/ActorSigil";
import { originLabel, type ThreatActor } from "@/lib/threatactors";
import type { WireMention } from "@/lib/actor-wire";

// The dossier is a file in the paper's morgue. This file holds its masthead
// (the file tab, the name, the aliases, the meta line, the rose) and the two
// small pieces every section of the dossier shares: the ruled section head
// and the redaction bar. They live here rather than in components/site
// because they are the dossier's own vocabulary.

// --- shared dossier pieces --------------------------------------------------

/** The width every dossier section uses; the rhythm between them is fixed here. */
export const DOSSIER_SECTION = "sheet mt-12 sm:mt-14";

/** A label head over a 1px ink rule: "ARSENAL ······ 14 MALWARE · 9 TOOLS". */
export function SectionHead({
  id,
  children,
  aside,
}: {
  id?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="rule-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
      <h2 id={id} className="label text-ink">
        {children}
      </h2>
      {aside && <span className="label text-ink-3">{aside}</span>}
    </div>
  );
}

/** Words in the label voice, run together with middots: aliases, countries,
 *  sectors — the index-line of a newspaper, not a row of chips. Mono stays
 *  reserved for figures and codes. */
export function LabelRun({
  items,
  className = "",
  tone = "text-ink-2",
  ...rest
}: {
  items: React.ReactNode[];
  className?: string;
  tone?: string;
} & Omit<React.HTMLAttributes<HTMLUListElement>, "className">) {
  return (
    <ul className={`label flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 ${tone} ${className}`} {...rest}>
      {items.map((it, i) => (
        <li key={i} className="flex min-w-0 items-baseline gap-x-2.5">
          {i > 0 && (
            <span aria-hidden className="text-ink-3">
              ·
            </span>
          )}
          <span className="min-w-0">{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** A filled ink block the width of a word, for a slot the sources leave empty. */
export function Redacted({ caption = "not stated by sources", className = "" }: { caption?: string; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span aria-hidden className="inline-block h-[0.75em] w-[5.5ch] translate-y-px bg-ink" />
      <span className="label normal-case tracking-[0.06em] text-ink-3">{caption}</span>
    </span>
  );
}

// --- the masthead -----------------------------------------------------------

// Module-load epoch for the "on the wire" liveness check — the purity rule
// bans reading the wall clock inside render, and a lambda instance's module
// scope lives minutes while the 90-day window doesn't care about that drift.
const RENDER_EPOCH = Date.now();
const NINETY_DAYS_MS = 90 * 24 * 3600_000;

const TYPE_WORD: Record<string, string> = {
  "nation-state": "Nation-state",
  crime: "Crime",
  unknown: "Unknown",
};

function typeWord(type: string): string {
  if (TYPE_WORD[type]) return TYPE_WORD[type];
  return type ? type[0].toUpperCase() + type.slice(1) : "Unknown";
}

function isoDay(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

// The file tab across the top of the dossier, then the name in the slab, the
// aliases as tags, and a mono meta line of everything else a source states.
// Each piece of the tab prints only when the source states it. The rose on
// the right is drawn from the actor's real ATT&CK coverage; without any, the
// deterministic sigil stands in.
export function ActorHeader({ actor, mentions }: { actor: ThreatActor; mentions: WireMention[] }) {
  const origin = originLabel(actor);
  // MISP galaxy states a literal "50" on ~150 actors (APT1, APT28 …) — its
  // unassessed midpoint, not an assessment. Rendering it as "source-stated
  // confidence" put a meaningless number on APT28's masthead, so only values
  // the source actually chose (25, 75, 100 …) are shown. Missing is already null.
  const confidence = actor.attribution_confidence != null && actor.attribution_confidence !== 50 ? actor.attribution_confidence : null;
  const onWire = mentions.length > 0 && RENDER_EPOCH - new Date(mentions[0].at).getTime() <= NINETY_DAYS_MS;

  const aliases = (actor.aliases || []).filter((x) => x !== actor.name).slice(0, 8);
  const sources = actor.sources && actor.sources.length ? actor.sources : actor.source ? [actor.source] : [];
  const refreshed = isoDay(actor.last_refreshed);
  const techniques = actor.techniques ?? [];
  const tacticCount = countTactics(techniques);

  const tab: string[] = ["File", actor.name, typeWord(actor.type)];
  if (origin) tab.push(`assessed origin ${origin}`);
  if (sources.length) tab.push(sources.join(" + "));
  if (refreshed) tab.push(`refreshed ${refreshed}`);
  if (onWire) tab.push("on the wire");

  // The meta line is words in the label voice; only the MITRE id and the
  // confidence figure are set in mono, being a code and a number.
  const metaItems: React.ReactNode[] = [];
  if (actor.state_sponsor) metaItems.push(<span key="sponsor">state sponsor · {actor.state_sponsor}</span>);
  if (confidence != null)
    metaItems.push(
      <span key="conf">
        attribution confidence <span className="num font-mono text-[12px] tracking-normal">{confidence}/100</span> (source-stated)
      </span>
    );
  if (actor.mitre)
    metaItems.push(
      <a
        key="mitre"
        href={`https://attack.mitre.org/groups/${actor.mitre}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ulink transition-colors hover:text-ink"
      >
        MITRE <span className="num font-mono text-[12px] tracking-normal">{actor.mitre}</span> ↗
      </a>
    );

  return (
    <header className="sheet pt-6 sm:pt-8">
      <div className="ink-box bg-paper-deep">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
          <Link href="/actors" className="label text-ink-3 transition-colors hover:text-ink">
            ← Adversaries
          </Link>
          <span aria-hidden className="label text-ink-3">
            |
          </span>
          <p className="label text-ink">{tab.join(" · ")}</p>
        </div>
      </div>

      {/* Both columns sit on the same baseline (items-end) so the 2px rule
          below closes the masthead at its last line, whichever column is
          taller; the rose caption stands beside the rose, not under it. */}
      <div className="grid gap-8 pt-8 md:grid-cols-12 md:items-end md:gap-6 md:pt-10">
        <div className="min-w-0 md:col-span-8">
          <h1 className="headline pressed-once text-[clamp(2.6rem,7vw,5.5rem)] text-ink">{actor.name}</h1>
          {aliases.length > 0 && <LabelRun items={aliases} className="mt-5" tone="text-ink" aria-label="Aliases" />}
          {metaItems.length > 0 && (
            <p className="label mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-ink-3">
              {metaItems}
            </p>
          )}
        </div>
        <div className="md:col-span-4 md:justify-self-end">
          <div className="flex items-end gap-5 md:flex-row-reverse">
            {techniques.length > 0 ? (
              <AttackRose actor={actor} className="h-[9rem] w-[9rem] shrink-0 sm:h-[11rem] sm:w-[11rem]" />
            ) : (
              <span className="grid shrink-0 place-items-center text-ink">
                <ActorSigil a={actor} size={96} />
              </span>
            )}
            <p className="label max-w-[18ch] pb-1 text-ink-3 md:text-right">
              {techniques.length > 0 ? `attack rose · ${techniques.length} techniques across ${tacticCount} tactics` : "sigil · no ATT&CK coverage stated"}
            </p>
          </div>
        </div>
      </div>
      <div className="rule-2 mt-6" />
    </header>
  );
}
