import { getDb } from "./db";
import { originLabel, type ThreatActor, type Ttp } from "./threatactors";
import type { Locale } from "./i18n";

// Read-only, geopolitical view of the engine's `threat_actors` collection: the
// nation-state groups grouped by ORIGIN COUNTRY — "who operates from where, and
// who they hit". This is the one lens /actors (full roster) and /sektor (by
// industry) don't offer. `origin_country` is a plain ISO2 code (CN, IR, RU, …);
// we group on it verbatim and only shape/guard/link the data. Nothing here is
// invented — every group and every actor comes straight from the archive.

export type AptActor = {
  _id: string; // stable slug → /actors/[_id] dossier
  name: string;
  type: string; // "nation-state" (kept generic so AttackRose colours correctly)
  techniques: Ttp[]; // real ATT&CK TTPs → drives the AttackRose emblem
  tagline: { az: string | null; en: string | null };
  targetCount: number; // # of stated target countries
  victim_count: number | null;
};

export type AptCountry = {
  country_code: string; // ISO2, uppercased (the grouping key)
  name_az: string;
  name_en: string;
  actors: AptActor[]; // richest-first, capped at PER_COUNTRY_CAP
  actorCount: number; // grounded TOTAL in this origin, before any cap
  capped: boolean; // true when actorCount > PER_COUNTRY_CAP (some hidden)
};

export type AptAtlas = {
  countries: AptCountry[]; // biggest origins first
  totalActors: number; // nation-state groups placed on the atlas
  countryCount: number; // distinct origin countries represented
};

// A few origins in the roster aren't in the shared originLabel() map yet
// (lib/threatactors). Supplement ONLY those so an AZ reader gets a real
// Azerbaijani name instead of the English state_sponsor fallback. originLabel
// remains the primary source for every code it already covers.
const SUPP_AZ: Record<string, string> = {
  PS: "Fələstin", KR: "Cənubi Koreya", BY: "Belarus",
  AE: "BƏƏ", ES: "İspaniya", FR: "Fransa",
};
const SUPP_EN: Record<string, string> = {
  PS: "Palestine", KR: "South Korea", BY: "Belarus",
  AE: "UAE", ES: "Spain", FR: "France",
};

// Cap cards rendered per country so a huge origin (e.g. CN, 41 groups) doesn't
// dominate the page; the header still shows the honest total and links the rest
// into the /actors roster.
const PER_COUNTRY_CAP = 12;

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

function toTtps(v: unknown): Ttp[] {
  if (!Array.isArray(v)) return [];
  const out: Ttp[] = [];
  for (const t of v) {
    if (!t || typeof t !== "object") continue;
    const rec = t as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    if (!id) continue; // id is the load-bearing field
    out.push({
      id,
      name: typeof rec.name === "string" ? rec.name : "",
      tactic: typeof rec.tactic === "string" ? rec.tactic : null,
    });
  }
  return out;
}

function toAptActor(a: ThreatActor): AptActor | null {
  const _id = typeof a._id === "string" ? a._id : "";
  const name = typeof a.name === "string" ? a.name.trim() : "";
  if (!_id || !name) return null; // skip a nameless / keyless stub
  return {
    _id,
    name,
    type: a.type || "nation-state",
    techniques: toTtps(a.techniques),
    tagline: { az: strOrNull(a.tagline?.az), en: strOrNull(a.tagline?.en) },
    targetCount: Array.isArray(a.targets_countries) ? a.targets_countries.length : 0,
    victim_count: typeof a.victim_count === "number" ? a.victim_count : null,
  };
}

// Country display name: reuse the shared originLabel() first (it needs a
// representative actor for its state_sponsor fallback), supplement the gaps.
function countryName(rep: ThreatActor, cc: string, locale: Locale): string {
  const supp = locale === "en" ? SUPP_EN : SUPP_AZ;
  return supp[cc] ?? originLabel(rep, locale) ?? cc;
}

// Best-documented first — an actor with real ATT&CK TTPs (a rendered AttackRose,
// not just an initials seal) and observed scale leads its country; this decides
// which survive the per-country cap. Mirrors the substance-first ordering in
// lib/threatactors so the atlas and the roster agree on what "leading" means.
function richness(a: AptActor): number {
  return (
    (a.techniques.length ? 2 : 0) +
    ((a.victim_count ?? 0) > 0 ? 1 : 0) +
    (a.targetCount > 0 ? 1 : 0)
  );
}
function byRichness(a: AptActor, b: AptActor): number {
  return (
    richness(b) - richness(a) ||
    b.techniques.length - a.techniques.length ||
    (b.victim_count ?? 0) - (a.victim_count ?? 0) ||
    b.targetCount - a.targetCount ||
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

// Small, refreshed on the engine's cadence — cache so the page render and the
// stat band don't each re-hit Mongo during a build/ISR pass.
let cache: { at: number; atlas: AptAtlas } | null = null;
const TTL_MS = 60 * 60_000;

const EMPTY: AptAtlas = { countries: [], totalActors: 0, countryCount: 0 };

export async function getAptAtlas(): Promise<AptAtlas> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.atlas;

  let atlas: AptAtlas = EMPTY;
  try {
    const db = await getDb();
    const docs = await db
      .collection<ThreatActor>("threat_actors")
      .find({ type: "nation-state" })
      .toArray();

    // Group by uppercased ISO2 origin. An actor with no origin can't be placed
    // on a geopolitical atlas, so it's skipped (all 91 carry one today; guard
    // keeps the contract if that ever changes).
    const groups = new Map<string, { rep: ThreatActor; actors: AptActor[] }>();
    for (const d of docs) {
      const cc = typeof d.origin_country === "string" ? d.origin_country.trim().toUpperCase() : "";
      if (!cc) continue;
      const shaped = toAptActor(d);
      if (!shaped) continue;
      let g = groups.get(cc);
      if (!g) {
        g = { rep: d, actors: [] };
        groups.set(cc, g);
      }
      g.actors.push(shaped);
    }

    const countries: AptCountry[] = [];
    let total = 0;
    for (const [cc, g] of groups) {
      g.actors.sort(byRichness);
      const actorCount = g.actors.length;
      total += actorCount;
      const capped = actorCount > PER_COUNTRY_CAP;
      countries.push({
        country_code: cc,
        name_az: countryName(g.rep, cc, "az"),
        name_en: countryName(g.rep, cc, "en"),
        actors: capped ? g.actors.slice(0, PER_COUNTRY_CAP) : g.actors,
        actorCount,
        capped,
      });
    }
    // Biggest origins first — the geopolitical headline ("who operates from
    // where"); ties broken alphabetically for a stable order.
    countries.sort(
      (a, b) => b.actorCount - a.actorCount || a.name_en.localeCompare(b.name_en, "en"),
    );

    atlas = { countries, totalActors: total, countryCount: countries.length };
  } catch {
    atlas = EMPTY; // DB unreachable → the page renders its empty state.
  }

  cache = { at: now, atlas };
  return atlas;
}
