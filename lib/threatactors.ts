import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import type { Locale } from "./i18n";

// Read-only view of ctiaze-engine's threat_actors collection; search scoring
// mirrors cti/actors.py so the site and CLI answer identically.
export type ActorRecentItem = { title: string; url: string; date?: string | Date };
export type Ttp = { id: string; name: string; tactic?: string | null };
export type NamedRef = { id: string | null; name: string };

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
  mitre?: string | null;
  source: "misp-galaxy" | "ransomware.live" | "mitre-attack" | string;
  sources?: string[];
  attribution_confidence?: number | null;
  techniques?: Ttp[];
  malware?: NamedRef[];
  tools?: NamedRef[];
  victim_count?: number | null;
  first_seen?: Date | string | null;
  last_active?: Date | string | null;
  related_actors?: { name: string; _id: string }[];
  recent_activity: ActorRecentItem[];
  last_refreshed?: Date | string;
  // DO-credit enrichment (engine ops/actor_playbooks + actor_intel): grounded
  // per-stage detection guidance and a two-language analyst brief.
  playbook?: {
    stages?: { tactic?: string | null; techniques?: string[]; az?: string | null; en?: string | null }[] | null;
  } | null;
  intel?: { az?: string | null; en?: string | null } | null;
  tagline?: { az?: string | null; en?: string | null } | null;
};

export type ActorHit = ThreatActor & {
  match_reasons: string[];
  match_score: number;
};

async function collection() {
  const db = await getDb();
  return db.collection<ThreatActor>("threat_actors");
}

// Roster is small and refreshed weekly — cache it so search doesn't re-hit Mongo.
let rosterCache: { at: number; docs: ThreatActor[] } | null = null;
const ROSTER_TTL_MS = 60 * 60_000;

let rosterInFlight: Promise<ThreatActor[]> | null = null;

async function allActors(): Promise<ThreatActor[]> {
  if (rosterCache && Date.now() - rosterCache.at < ROSTER_TTL_MS) return rosterCache.docs;
  if (rosterInFlight) return rosterInFlight; // in-flight guard: concurrent callers share one scan
  rosterInFlight = (async () => {
    try {
      const col = await collection();
      const docs = await col.find({}).toArray();
      rosterCache = { at: Date.now(), docs };
      return docs;
    } finally {
      rosterInFlight = null;
    }
  })();
  return rosterInFlight;
}

// Lean roster for the index surfaces (/actors cards, stats, sorts): everything
// the cards render EXCEPT playbook + intel — the two multi-KB dossier-only
// fields. This is what keeps the /actors cold render inside the function budget
// (the full fetch was the intermittent "can't access /actors" failure).
let leanCache: { at: number; docs: ThreatActor[] } | null = null;
let leanInFlight: Promise<ThreatActor[]> | null = null;

async function leanActors(): Promise<ThreatActor[]> {
  if (rosterCache && Date.now() - rosterCache.at < ROSTER_TTL_MS) return rosterCache.docs;
  if (leanCache && Date.now() - leanCache.at < ROSTER_TTL_MS) return leanCache.docs;
  // In-flight guard: the /actors index fans out to getRegional/getStats/getIndex
  // concurrently, each calling this — without the guard that raced THREE full
  // scans at once and blew the cold render past the function budget ("can't
  // access /actors"). Concurrent callers now share the one scan.
  if (leanInFlight) return leanInFlight;
  leanInFlight = (async () => {
    try {
      const col = await collection();
      // Drop the dossier-only playbook/intel AND the `ml` search-embedding vector
      // (~half the roster payload, never read on the index/cards/scoring path) —
      // this is what pulls the 1,412-actor cold scan back under the function
      // budget on the throttled tier (73s → ~34s), so getActorsPageData actually
      // finishes and populates the shared cache instead of timing out.
      const docs = (await col.find({}, { projection: { playbook: 0, intel: 0, ml: 0 } }).toArray()) as ThreatActor[];
      leanCache = { at: Date.now(), docs };
      return docs;
    } finally {
      leanInFlight = null;
    }
  })();
  return leanInFlight;
}

// One dossier by its stable slug (_id) — powers the crawlable /actors/[slug] page
// AND the sector hubs' top-actor resolution. Serve from the roster cache when it's
// already warm; otherwise fetch just THIS dossier by its indexed _id. Never pull
// the whole roster (with its multi-KB playbook+intel fields per actor) into memory
// just to find one actor — that full fetch was the sector hubs' >2min cold render.
export async function getActorById(id: string): Promise<ThreatActor | null> {
  if (rosterCache && Date.now() - rosterCache.at < ROSTER_TTL_MS) {
    return rosterCache.docs.find((a) => a._id === id) ?? null;
  }
  const col = await collection();
  return (await col.findOne({ _id: id })) as ThreatActor | null;
}

// Every actor slug, for the sitemap. Substantive actors first (a thin name-only
// stub is low-value to crawl), capped so the sitemap stays a sensible size.
export async function getActorIds(limit = 800): Promise<string[]> {
  const docs = await leanActors();
  return [...docs]
    .sort((a, b) => substance(b) - substance(a) || activity(b) - activity(a) || byName(a, b))
    .slice(0, limit)
    .map((a) => a._id);
}

// Every actor as {id, name}, alphabetical — powers the crawlable A–Z index so the
// ~800 dossiers in the sitemap actually receive internal links (a sitemap-only URL
// ranks poorly). Same substantive-first cap as the sitemap so the two agree.
export async function getActorIndex(limit = 800): Promise<{ id: string; name: string; type: string }[]> {
  const docs = await leanActors();
  return [...docs]
    .sort((a, b) => substance(b) - substance(a) || activity(b) - activity(a) || byName(a, b))
    .slice(0, limit)
    .map((a) => ({ id: a._id, name: a.name, type: a.type }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export async function getActorStats(): Promise<{
  total: number;
  active: number;
  translated: number;
  lastRefreshed: string | null;
}> {
  const docs = await leanActors();
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

// Regional weighting (mirrors cti/actors.REGIONAL_WEIGHT), keyed by lowercased country.
const REGIONAL_WEIGHT: Record<string, number> = {
  azerbaijan: 100, turkey: 40, "türkiye": 40, georgia: 30,
  armenia: 30, russia: 20, iran: 20,
};

export function regionalWeight(a: ThreatActor): number {
  return Math.max(
    0,
    ...(a.targets_countries ?? []).map((c) => REGIONAL_WEIGHT[norm(c)] ?? 0)
  );
}

// How well-documented an actor is: ATT&CK TTPs, a MITRE id, observed victims. A
// thin name-only stub scores 0 and sinks; the named APTs and tracked ransomware
// ops rise. This — not a 4%-populated recent_activity count — is the honest signal.
function substance(a: ThreatActor): number {
  return (
    (a.techniques?.length ? 1 : 0) +
    (a.mitre ? 1 : 0) +
    ((a.victim_count ?? 0) > 0 ? 1 : 0) +
    (a.targets_countries?.length ? 1 : 0)
  );
}

// A recency/scale signal that works for both APTs (items in our feed) and crime
// groups (observed leak-site victims).
function activity(a: ThreatActor): number {
  return Math.max(a.victim_count ?? 0, a.recent_activity?.length ?? 0);
}

function byName(a: ThreatActor, b: ThreatActor): number {
  return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
}

// The APTs and crime groups stated to target Azerbaijan / the Caucasus — the whole
// reason a local reader comes here rather than to MITRE. Regional weight first.
export async function getRegionalActors(n = 6): Promise<ThreatActor[]> {
  const docs = await leanActors();
  return docs
    .filter((a) => regionalWeight(a) > 0)
    .sort(
      (a, b) =>
        regionalWeight(b) - regionalWeight(a) ||
        activity(b) - activity(a) ||
        substance(b) - substance(a) ||
        byName(a, b)
    )
    .slice(0, n);
}

// The general "leading actors" grid — the best-documented, most-active actors
// (richness first, so thin stubs never lead), with an optional exclude set so it
// doesn't repeat the regional section shown above it.
// Everything the /actors index page needs, as ONE entry in Vercel's shared data
// cache. The locale cookie keeps the route dynamic, so this — not route ISR —
// is what saves a cold lambda from refetching the roster ("can't access /actors").
export const getActorsPageData = unstable_cache(
  async () => {
    const [regional, stats, index] = await Promise.all([
      getRegionalActors(6),
      getActorStats(),
      getActorIndex(),
    ]);
    const top = await getTopActors(24, new Set(regional.map((a) => a._id)));
    return { regional, top, stats, index };
  },
  ["actors-page-v2"],
  { revalidate: 3600 },
);

// Per-dossier shared cache — Date fields JSON-round-trip to strings, which every
// consumer (fmtDay etc.) already accepts.
export const getActorByIdCached = unstable_cache(
  async (id: string) => getActorById(id),
  ["actor-by-id-v1"],
  { revalidate: 3600 },
);

export async function getTopActors(n = 12, exclude?: Set<string>): Promise<ThreatActor[]> {
  const docs = await leanActors();
  return [...docs]
    .filter((a) => !exclude?.has(a._id))
    .sort(
      (a, b) =>
        substance(b) - substance(a) ||
        activity(b) - activity(a) ||
        regionalWeight(b) - regionalWeight(a) ||
        byName(a, b)
    )
    .slice(0, n);
}

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

// Word-boundary match, so "us" never matches "Russia".
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

// Targeting data is stored in English (ISO2_COUNTRY names + MISP/ransomware.live
// sectors), so an AZ-locale analyst typing "Azərbaycan"/"maliyyə"/"energetika"
// would match nothing. Map the common AZ country + sector nouns to their English
// equivalent so the flagship "Azərbaycanı kim hədəfləyir?" question works when
// actually asked in Azerbaijani. (Names/aliases are language-neutral — matched as-is.)
const AZ_QUERY_EN: Record<string, string> = {
  "azərbaycan": "azerbaijan", "azerbaycan": "azerbaijan", "türkiyə": "turkey",
  "turkiye": "turkey", "gürcüstan": "georgia", "gurcustan": "georgia",
  "ermənistan": "armenia", "ermenistan": "armenia", "rusiya": "russia",
  "iran": "iran", "çin": "china", "cin": "china", "ukrayna": "ukraine",
  "abş": "united states", "abs": "united states", "almaniya": "germany",
  "fransa": "france", "israil": "israel", "polşa": "poland", "hindistan": "india",
  "pakistan": "pakistan", "qazaxıstan": "kazakhstan", "özbəkistan": "uzbekistan",
  // sectors (matched against "Financial Services", "Energy & Utilities", etc.)
  "maliyyə": "financial", "bank": "financial", "banklar": "financial",
  "enerji": "energy", "energetika": "energy", "neft": "energy", "qaz": "energy",
  "hökumət": "government", "dövlət": "government", "səhiyyə": "healthcare",
  "təhsil": "education", "telekom": "telecommunications",
  "telekommunikasiya": "telecommunications", "müdafiə": "defense",
  "hərbi": "military", "ordu": "military", "istehsalat": "manufacturing",
  "nəqliyyat": "transportation", "texnologiya": "technology",
};

// Single-term search across country, sector, and name/alias; unions the provenance.
// Only returns actors the source actually states — no fabricated links.
export async function searchActors(term: string, limit = 24): Promise<ActorHit[]> {
  const t = term.trim();
  if (!t) return [];
  const en = AZ_QUERY_EN[norm(t)];   // English equivalent of an AZ country/sector term
  const docs = await leanActors();
  const hits: ActorHit[] = [];
  for (const a of docs) {
    const reasons: string[] = [];
    let score = 0;
    const cr = countryReason(a, t) || (en ? countryReason(a, en) : null);
    if (cr) {
      reasons.push(cr);
      score += 40;
    }
    const sr = sectorReason(a, t) || (en ? sectorReason(a, en) : null);
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

const ORIGIN_AZ: Record<string, string> = {
  RU: "Rusiya", IR: "İran", KP: "Şimali Koreya", CN: "Çin", US: "ABŞ",
  GB: "Böyük Britaniya", IL: "İsrail", IN: "Hindistan", PK: "Pakistan",
  VN: "Vyetnam", TR: "Türkiyə", UA: "Ukrayna", SY: "Suriya", LB: "Livan",
};
const ORIGIN_EN: Record<string, string> = {
  RU: "Russia", IR: "Iran", KP: "North Korea", CN: "China", US: "USA",
  GB: "United Kingdom", IL: "Israel", IN: "India", PK: "Pakistan",
  VN: "Vietnam", TR: "Türkiye", UA: "Ukraine", SY: "Syria", LB: "Lebanon",
};

export function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) return "";
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export function originLabel(a: ThreatActor, locale: Locale = "az"): string | null {
  const cc = a.origin_country;
  const map = locale === "en" ? ORIGIN_EN : ORIGIN_AZ;
  return (cc && map[cc.toUpperCase()]) || a.state_sponsor || (cc ? cc.toUpperCase() : null);
}

export function actorInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
