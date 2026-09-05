import Link from "next/link";
import { Kicker } from "@/components/site/Kicker";
import { AttackRose } from "@/components/actors/AttackRose";
import { ActorSigil } from "@/components/actors/ActorSigil";
import { originLabel, type ThreatActor } from "@/lib/threatactors";
import type { WireMention } from "@/lib/actor-wire";

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

// The 14 kill-chain tactics the rose actually draws — used only to caption its
// coverage honestly ("N techniques across K tactics"), never to invent a count.
const TACTICS = new Set([
  "reconnaissance", "resource-development", "initial-access", "execution", "persistence",
  "privilege-escalation", "defense-evasion", "credential-access", "discovery",
  "lateral-movement", "collection", "command-and-control", "exfiltration", "impact",
]);
const normTactic = (s?: string | null) => (s ?? "").toLowerCase().replace(/[_\s]+/g, "-").trim();

// The dossier's masthead: a way back, the assessed-origin/confidence kicker
// (each piece rendered only when the source actually states it), the name,
// up to eight aliases, and a meta line of everything else grounded to a
// source. The generative rose/sigil on the right is the same visual identity
// used across the site — real ATT&CK coverage when we have it, a deterministic
// sigil when we don't.
export function ActorHeader({ actor, mentions }: { actor: ThreatActor; mentions: WireMention[] }) {
  const origin = originLabel(actor);
  const confidence = actor.attribution_confidence ?? null;
  const live = mentions.length > 0 && RENDER_EPOCH - new Date(mentions[0].at).getTime() <= NINETY_DAYS_MS;

  const kickerParts = [
    typeWord(actor.type),
    origin ? `assessed origin ${origin}` : null,
    confidence != null ? `attribution confidence ${confidence}/100 (source-stated)` : null,
  ].filter((x): x is string => x !== null);

  const aliases = (actor.aliases || []).filter((x) => x !== actor.name).slice(0, 8);
  const sources = actor.sources && actor.sources.length ? actor.sources : actor.source ? [actor.source] : [];
  const refreshed = isoDay(actor.last_refreshed);
  const techniques = actor.techniques ?? [];
  const tacticCount = new Set(techniques.map((t) => normTactic(t.tactic)).filter((t) => TACTICS.has(t))).size;

  const metaItems: React.ReactNode[] = [];
  if (actor.state_sponsor) metaItems.push(<span key="sponsor">state sponsor · {actor.state_sponsor}</span>);
  if (actor.mitre)
    metaItems.push(
      <a
        key="mitre"
        href={`https://attack.mitre.org/groups/${actor.mitre}`}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-ink-primary"
      >
        {actor.mitre} ↗
      </a>
    );
  if (sources.length) metaItems.push(<span key="sources">{sources.join(" + ")}</span>);
  if (refreshed) metaItems.push(<span key="refreshed">refreshed {refreshed}</span>);

  return (
    <header className="mx-auto w-full max-w-[80rem] px-[var(--sp-gutter)] pt-12 sm:pt-20">
      <Link
        href="/actors"
        className="mb-6 block w-fit font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink-primary"
      >
        ← adversaries
      </Link>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {kickerParts.length > 0 && <Kicker live={live}>{kickerParts.join(" · ")}</Kicker>}
          <h1 className="mt-6 text-balance font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.0] tracking-[-0.03em] text-ink-primary">
            {actor.name}
          </h1>
          {aliases.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {aliases.map((al) => (
                <span
                  key={al}
                  className="rounded-[var(--radius-chip)] border border-hairline px-1.5 py-0.5 font-mono text-[11px] text-ink-muted"
                >
                  {al}
                </span>
              ))}
            </div>
          )}
          {metaItems.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-muted">
              {metaItems}
            </div>
          )}
        </div>
        <div className="mx-auto shrink-0 text-center md:mx-0">
          {techniques.length > 0 ? (
            <AttackRose actor={actor} className="mx-auto h-[13rem] w-[13rem]" />
          ) : (
            <div className="mx-auto grid place-items-center text-ink-secondary">
              <ActorSigil a={actor} size={120} />
            </div>
          )}
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            {techniques.length > 0 ? `attack rose · ${techniques.length} techniques across ${tacticCount} tactics` : "sigil"}
          </p>
        </div>
      </div>
    </header>
  );
}
