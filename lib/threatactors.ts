import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { countryName, resolveCountry } from "./geo";
import { isAliasActorId } from "./actor-aliases";
import { getWireMentions, type WireMention } from "./actor-wire";

export { flagEmoji } from "./geo";

// Read-only view of ctiaze-engine's `threat_actors` collection (weekly ETL:
// MISP galaxy + ransomware.live + MITRE ATT&CK). Nothing here infers — every
// field is what a source states; the site only ranks, groups and links.
export type Ttp = { id: string; name: string; tactic?: string | null };
export type NamedRef = { id: string | null; name: string };
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
  refs: string[];
  mitre?: string | null;
  source: string;
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
  // --- written by the engine's tracking pass, absent until it has run for an
  // actor. Every one is optional on purpose: a dossier must render completely
  // from the roster alone, and "we have not computed this yet" must look
  // different from "this actor did nothing", which is why the components below
  // render nothing rather than a row of zeroes.
  /** Rolling 30-day counts recomputed daily from actor_events. */
  activity_30d?: ActorActivity | null;
  /** CVEs our own dispatches named alongside this actor. */
  cves?: ActorCve[] | null;
  /** Newest-first log of what the tracker saw change. */
  changes?: ActorChange[] | null;
  changed_at?: Date | string | null;
  /** Primary-source report links (APTnotes), newest first. */
  reports?: { title: string; source?: string | null; date?: string | null; url: string }[] | null;
};

export type ActorActivity = {
  stories: number;
  victims: number;
  cves_new: number;
  top_countries?: string[];
  top_sectors?: string[];
  last_seen?: string | null;
  computed_at?: string | null;
};

export type ActorCve = { cve: string; kev?: boolean; epss?: number | null; item?: string | null; date?: string | null };

export type ActorChange = { at: string; kind: string; detail: string };

/** True when the tracker has something to show — not merely that it ran. */
export function hasActivity(x: ActorActivity | null | undefined): x is ActorActivity {
  return !!x && (x.stories > 0 || x.victims > 0 || x.cves_new > 0);
}

/** The lean row every index surface renders — JSON-safe, no multi-KB fields. */
export type ActorRow = {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  origin: string | null; // ISO-2
  originLabel: string | null;
  techniqueCount: number;
  victims: number;
  lastActive: string | null; // ISO
  mitre: string | null;
  summary: string; // first sentence of the description
  wire: number; // dispatches on our wire mentioning this actor (last 90 days)
};

async function collection() {
  const db = await getDb();
  return db.collection<ThreatActor>("threat_actors");
}

// One roster scan per warm lambda-hour, shared by every concurrent caller. The
// `ml` embedding is half the payload and never read here — projected out.
let leanCache: { at: number; docs: ThreatActor[] } | null = null;
let leanInFlight: Promise<ThreatActor[]> | null = null;
const ROSTER_TTL_MS = 60 * 60_000;

async function leanActors(): Promise<ThreatActor[]> {
  if (leanCache && Date.now() - leanCache.at < ROSTER_TTL_MS) return leanCache.docs;
  if (leanInFlight) return leanInFlight;
  leanInFlight = (async () => {
    try {
      const col = await collection();
      const docs = (await col.find({}, { projection: { ml: 0, description_az: 0 } }).toArray()) as ThreatActor[];
      leanCache = { at: Date.now(), docs };
      return docs;
    } finally {
      leanInFlight = null;
    }
  })();
  return leanInFlight;
}

export async function getActorById(id: string): Promise<ThreatActor | null> {
  const col = await collection();
  return (await col.findOne({ _id: id }, { projection: { ml: 0, description_az: 0 } })) as ThreatActor | null;
}

// Display names for a handful of actor ids, for the /cve hub's "adversaries
// named alongside it" chips (2026-10-10). It used to read getActorsPageData()
// for this, i.e. parse the whole ~1,400-actor index blob on every CVE render to
// look up two or three names. Same rule as the index: an actor gets its name
// only if actorHasInfo() would list it, otherwise the caller falls back to the
// id. $slice keeps one element of each array, which is all actorHasInfo() needs
// (it tests lengths), so the read stays a few hundred bytes per actor.
export async function getActorNamesFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const col = await collection();
  const docs = (await col
    .find(
      { _id: { $in: ids } },
      {
        projection: {
          name: 1,
          description_en: 1,
          mitre: 1,
          victim_count: 1,
          techniques: { $slice: 1 },
          targets_countries: { $slice: 1 },
        },
      },
    )
    .toArray()) as ThreatActor[];
  for (const a of docs) if (actorHasInfo(a)) out.set(a._id, a.name);
  return out;
}

// Per-dossier shared cache (daily, like the page). Dates round-trip to strings.
// Key bumped 2026-09-07: the weekly refresh raised APT28 from 16 techniques to
// 93 (the old MITRE cap), and unstable_cache survives deployments — a version
// key is the only way to make the site show data that already changed.
export const getActorByIdCached = unstable_cache(async (id: string) => getActorById(id), ["actor-by-id-v4"], {
  revalidate: 86400,
});

// --- ranking signals ---------------------------------------------------------

// How well-documented an actor is: ATT&CK TTPs, a MITRE id, observed victims,
// stated targeting. A name-only stub scores 0 and sinks.
export function substance(a: ThreatActor): number {
  return (
    (a.techniques?.length ? 1 : 0) +
    (a.mitre ? 1 : 0) +
    ((a.victim_count ?? 0) > 0 ? 1 : 0) +
    (a.targets_countries?.length ? 1 : 0)
  );
}

// Recency/scale that works for both APTs (feed items) and crime crews (victims).
function activity(a: ThreatActor): number {
  return Math.max(a.victim_count ?? 0, a.recent_activity?.length ?? 0);
}

function byName(a: ThreatActor, b: ThreatActor): number {
  return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
}

// Worth surfacing: a written dossier, or structured intel. Name-only stubs stay
// reachable by URL but never clutter the index.
export function actorHasInfo(a: ThreatActor): boolean {
  const desc = (a.description_en || "").trim();
  return desc.length >= 40 || substance(a) > 0;
}

async function indexActors(): Promise<ThreatActor[]> {
  return (await leanActors()).filter(actorHasInfo);
}

export function originLabel(a: Pick<ThreatActor, "origin_country" | "state_sponsor">): string | null {
  return countryName(a.origin_country) || a.state_sponsor || (a.origin_country ? a.origin_country.toUpperCase() : null);
}

export function actorInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function firstSentence(s: string | null | undefined, max = 180): string {
  const t = (s || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  const m = t.match(/^.{20,}?[.!?](?=\s|$)/);
  const out = m ? m[0] : t;
  return out.length > max ? out.slice(0, max - 1).trimEnd() + "…" : out;
}

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function toRow(a: ThreatActor, wire: number): ActorRow {
  return {
    id: a._id,
    name: a.name,
    aliases: (a.aliases || []).filter((x) => x !== a.name).slice(0, 4),
    type: a.type || "unknown",
    origin: a.origin_country ? a.origin_country.toUpperCase() : null,
    originLabel: originLabel(a),
    techniqueCount: a.techniques?.length ?? 0,
    victims: a.victim_count ?? 0,
    lastActive: toIso(a.last_active),
    mitre: a.mitre ?? null,
    summary: firstSentence(a.description_en),
    wire,
  };
}

// --- the index page, as one cached blob -------------------------------------

export type OriginGroup = { iso: string; name: string; count: number; lead: string[] };
export type IndexEntry = { id: string; name: string; type: string; origin: string | null; aliases: string[] };

export type ActorsPageData = {
  stats: { total: number; withTtps: number; crime: number; nationState: number; onWire90d: number; lastRefreshed: string | null };
  onTheWire: (ActorRow & { lastMention: string; mentions: WireMention[] })[];
  leading: ActorRow[];
  origins: OriginGroup[];
  index: IndexEntry[];
};

async function computeActorsPageData(): Promise<ActorsPageData> {
  const [docs, wire] = await Promise.all([indexActors(), getWireMentions().catch(() => null)]);
  const wireCount = (id: string) => wire?.byActor[id]?.length ?? 0;

  const leading = [...docs]
    .sort((a, b) => substance(b) - substance(a) || wireCount(b._id) - wireCount(a._id) || activity(b) - activity(a) || byName(a, b))
    .slice(0, 24)
    .map((a) => toRow(a, wireCount(a._id)));

  const onTheWire = (wire?.recent ?? [])
    .map((r) => {
      const a = docs.find((d) => d._id === r.id);
      if (!a) return null;
      return { ...toRow(a, r.count), lastMention: r.lastAt, mentions: wire!.byActor[r.id].slice(0, 3) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 12);

  const byOrigin = new Map<string, ThreatActor[]>();
  for (const a of docs) {
    const iso = a.origin_country?.toUpperCase();
    if (!iso || !countryName(iso)) continue;
    if (!byOrigin.has(iso)) byOrigin.set(iso, []);
    byOrigin.get(iso)!.push(a);
  }
  const origins: OriginGroup[] = [...byOrigin.entries()]
    .map(([iso, list]) => ({
      iso,
      name: countryName(iso)!,
      count: list.length,
      lead: [...list].sort((a, b) => substance(b) - substance(a) || byName(a, b)).slice(0, 3).map((a) => a.name),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const index: IndexEntry[] = [...docs]
    .sort(byName)
    .map((a) => ({
      id: a._id,
      name: a.name,
      type: a.type || "unknown",
      origin: a.origin_country ? a.origin_country.toUpperCase() : null,
      aliases: (a.aliases || []).filter((x) => x !== a.name && x.length >= 3).slice(0, 6),
    }));

  const lastRefreshed = docs.map((a) => new Date(a.last_refreshed ?? 0).getTime()).reduce((m, t) => Math.max(m, t || 0), 0);
  return {
    stats: {
      total: docs.length,
      withTtps: docs.filter((a) => (a.techniques?.length ?? 0) > 0).length,
      crime: docs.filter((a) => a.type === "crime").length,
      nationState: docs.filter((a) => a.type === "nation-state").length,
      onWire90d: wire?.recent.length ?? 0,
      lastRefreshed: lastRefreshed ? new Date(lastRefreshed).toISOString() : null,
    },
    onTheWire,
    leading,
    origins,
    index,
  };
}

export const getActorsPageData = unstable_cache(computeActorsPageData, ["actors-page-v4"], { revalidate: 3600 });

// A dossier with no ATT&CK techniques that our wire has never named is a thin
// copy of a MISP galaxy entry (~1,300 of them, 2026-10-10 audit). It stays
// reachable by URL and in the A–Z, but is noindex and left out of the sitemap,
// so search engines see the dossiers that carry something of ours.
export function isThinDossier(a: Pick<ThreatActor, "techniques">, wireMentions: number): boolean {
  return !(a.techniques?.length) && wireMentions === 0;
}

function lastChanged(a: Pick<ThreatActor, "changed_at" | "last_refreshed">): Date | null {
  for (const v of [a.changed_at, a.last_refreshed]) {
    const t = v ? new Date(v).getTime() : NaN;
    if (!Number.isNaN(t)) return new Date(t);
  }
  return null;
}

// The dossiers the sitemap lists, richest first: substantive, not an alias
// (those 308 to their canonical page), not thin. lastModified is when the
// dossier's content last changed (changed_at, falling back to the last refresh),
// not one date stamped on every row.
export async function getSitemapActors(limit = 5000): Promise<{ id: string; lastModified: Date | null }[]> {
  const [docs, wire] = await Promise.all([indexActors(), getWireMentions().catch(() => null)]);
  return [...docs]
    .filter((a) => !isAliasActorId(a._id) && !isThinDossier(a, wire?.byActor[a._id]?.length ?? 0))
    .sort((a, b) => substance(b) - substance(a) || activity(b) - activity(a) || byName(a, b))
    .slice(0, limit)
    .map((a) => ({ id: a._id, lastModified: lastChanged(a) }));
}

/** The actor's target list split into countries we can place and the rest (orgs, companies). */
export function splitTargets(a: Pick<ThreatActor, "targets_countries">): { placed: string[]; other: string[] } {
  const placed: string[] = [];
  const other: string[] = [];
  for (const t of a.targets_countries ?? []) {
    const iso = resolveCountry(t);
    if (iso) {
      if (!placed.includes(iso)) placed.push(iso);
    } else if (!other.includes(t)) other.push(t);
  }
  return { placed, other };
}
