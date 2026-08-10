import { getDb } from "./db";

// Mirrors one document in ctiaze-engine's `threat_actors` collection, written by
// the weekly cti/actors.py ETL. Read-only here. The query helpers below replicate
// actors.py's scoring EXACTLY (word-boundary matching, the same weights and
// provenance reasons) so the site and the CLI answer identically — and honestly:
// an actor is only ever returned for a dimension its source actually STATES.
export type ActorRecentItem = { title: string; url: string; date?: string | Date };

export type ThreatActor = {
  _id: string;
  name: string;
  aliases: string[];
  origin_country: string | null;
  state_sponsor: string | null;
  type: "nation-state" | "crime" | "unknown" | string;
  targets_countries: string[];
  targets_sectors: string[];
  description_en?: string | null;
  description_az?: string | null;
  refs: string[];
  source: "misp-galaxy" | "ransomware.live" | string;
  recent_activity: ActorRecentItem[];
  last_refreshed?: Date | string;
};

// A search hit is an actor plus the provenance the query attached (never stored) —
// one reason line per matched dimension, and a ranking weight.
export type ActorHit = ThreatActor & {
  match_reasons: string[];
  match_score: number;
};

async function collection() {
  const db = await getDb();
  return db.collection<ThreatActor>("threat_actors");
}

// The full roster is small (~1k tiny docs) and refreshed weekly, so a single
// cached read serves every search without re-hitting Mongo per query. TTL is a
// safety valve, not a freshness requirement.
let rosterCache: { at: number; docs: ThreatActor[] } | null = null;
const ROSTER_TTL_MS = 60 * 60_000; // 1h — the ETL runs weekly

async function allActors(): Promise<ThreatActor[]> {
  if (rosterCache && Date.now() - rosterCache.at < ROSTER_TTL_MS) return rosterCache.docs;
  const col = await collection();
  const docs = await col.find({}).toArray();
  rosterCache = { at: Date.now(), docs };
  return docs;
}

export async function getActorStats(): Promise<{
  total: number;
  active: number;
  translated: number;
  lastRefreshed: string | null;
}> {
  const docs = await allActors();
  const active = docs.filter((a) => (a.recent_activity?.length ?? 0) > 0).length;
  const translated = docs.filter((a) => a.description_az).length;
  const last = docs
    .map((a) => (a.last_refreshed ? new Date(a.last_refreshed).getTime() : 0))
    .reduce((m, t) => Math.max(m, t), 0);
  return {
    total: docs.length,
    active,
    translated,
    lastRefreshed: last ? new Date(last).toISOString() : null,
  };
}

// The Caucasus/Caspian audience @ctiaze serves — mirrors cti/actors.REGIONAL_WEIGHT
// so the site's landing order matches the CLI's. Keyed by lowercased country name.
const REGIONAL_WEIGHT: Record<string, number> = {
  azerbaijan: 100, turkey: 40, "türkiye": 40, georgia: 30,
  armenia: 30, russia: 20, iran: 20,
};

function regionalWeight(a: ThreatActor): number {
  return Math.max(
    0,
    ...(a.targets_countries ?? []).map((c) => REGIONAL_WEIGHT[norm(c)] ?? 0)
  );
}

// Site landing section — most-active actors first (by how many of our recent items
// mention them), regional targeting as the tiebreak. Mirrors actors.top_actors().
export async function getTopActors(n = 12): Promise<ThreatActor[]> {
  const docs = await allActors();
  return [...docs]
    .sort(
      (a, b) =>
        (b.recent_activity?.length ?? 0) - (a.recent_activity?.length ?? 0) ||
        regionalWeight(b) - regionalWeight(a) ||
        (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
    )
    .slice(0, n);
}

// ------------------------------------------------------------- query (honest match)
function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

// Case-insensitive word-boundary match — the honest primitive. A naive substring
// makes "us" match "Russia"; word boundaries don't. Mirrors actors._word_hit.
function wordHit(term: string, text: string): boolean {
  const t = norm(term);
  const x = norm(text);
  if (!t || !x) return false;
  if (t.length < 2) return t === x;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(x);
}

function countryReason(a: ThreatActor, country: string): string | null {
  for (const tc of a.targets_countries ?? []) if (wordHit(country, tc)) return `targets: ${tc}`;
  return null;
}
function sectorReason(a: ThreatActor, sector: string): string | null {
  for (const ts of a.targets_sectors ?? []) if (wordHit(sector, ts)) return `targets sector: ${ts}`;
  return null;
}
function nameReasons(a: ThreatActor, term: string): { reasons: string[]; score: number } {
  const reasons: string[] = [];
  let score = 0;
  if (wordHit(term, a.name || "")) {
    reasons.push("name match");
    score += 100;
  } else {
    for (const al of a.aliases ?? []) {
      if (wordHit(term, al)) {
        reasons.push(`alias match: ${al}`);
        score += 90;
        break;
      }
    }
  }
  for (const act of a.recent_activity ?? []) {
    if (wordHit(term, act.title || "") || wordHit(term, act.url || "")) {
      reasons.push(`recent activity mentions ${term}`);
      score += 60;
      break;
    }
  }
  return { reasons, score };
}

// The site's single-term search: run `term` across country, sector, and name/alias
// at once and union the provenance — exactly what `python -m cti.actors --who`
// does (search_any → actors_targeting on all three dimensions). Never fabricates a
// link: an actor not stated to target the term, and never named/mentioned for it,
// simply does not appear.
export async function searchActors(term: string, limit = 24): Promise<ActorHit[]> {
  const t = term.trim();
  if (!t) return [];
  const docs = await allActors();
  const hits: ActorHit[] = [];
  for (const a of docs) {
    const reasons: string[] = [];
    let score = 0;
    const cr = countryReason(a, t);
    if (cr) {
      reasons.push(cr);
      score += 40;
    }
    const sr = sectorReason(a, t);
    if (sr) {
      reasons.push(sr);
      score += 30;
    }
    const nr = nameReasons(a, t);
    reasons.push(...nr.reasons);
    score += nr.score;
    if (reasons.length) hits.push({ ...a, match_reasons: reasons, match_score: score });
  }
  hits.sort(
    (a, b) =>
      b.match_score - a.match_score ||
      (b.recent_activity?.length ?? 0) - (a.recent_activity?.length ?? 0) ||
      (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
  );
  return hits.slice(0, limit);
}

// ------------------------------------------------------------- display helpers
// A handful of common APT origins get an Azerbaijani country name + flag; anything
// else falls back to the ISO-2 code the source carried. Flag from ISO-2 regional
// indicators (never guessed — only rendered when origin_country is a real 2-letter
// code the ETL stored from MISP meta.country).
const ORIGIN_AZ: Record<string, string> = {
  RU: "Rusiya", IR: "İran", KP: "Şimali Koreya", CN: "Çin", US: "ABŞ",
  GB: "Böyük Britaniya", IL: "İsrail", IN: "Hindistan", PK: "Pakistan",
  VN: "Vyetnam", TR: "Türkiyə", UA: "Ukrayna", SY: "Suriya", LB: "Livan",
};

export function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) return "";
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export function originLabel(a: ThreatActor): string | null {
  const cc = a.origin_country;
  const name = (cc && ORIGIN_AZ[cc.toUpperCase()]) || a.state_sponsor || (cc ? cc.toUpperCase() : null);
  return name;
}

export const ACTOR_TYPE_LABEL: Record<string, string> = {
  "nation-state": "nation-state",
  crime: "crime",
  unknown: "naməlum",
};

// Initials for the dossier avatar — first letters of the first two name words.
export function actorInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
