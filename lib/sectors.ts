import { getDb } from "./db";
import { getActorById, type ThreatActor } from "./threatactors";

// Read-only view of the engine's `sector_intel` collection — 11 grounded
// defender hubs, one per CISA-style critical-infrastructure sector. Each doc's
// `_id` IS the URL slug (already a clean, unique ASCII slug identical to
// slugifyTerm(sector) — e.g. "financial-services", "government-facilities"); we
// reuse it verbatim rather than deriving a divergent scheme. Content (who / ttps
// / defense, az+en) is the engine's grounded output; this layer only shapes,
// guards, and links it. Nothing is invented here.
//
// Enrichment: `top_actors` (name strings) are resolved to real /actors/[slug]
// dossiers via the threat_actors roster (name → _id, alias fallback) so the hub
// links to live actor pages. `actor_count` is grounded — it equals the number of
// threat_actors carrying this sector in `sectors_canonical`. `ttp_profiles` is
// NOT joined: its sector taxonomy (Finance / Financial / Financial Services as
// separate labels) does not map cleanly onto these CISA-16 keys, and
// `top_techniques` already carries the grounded technique list.

export type SectorTechnique = { id: string; name: string; count: number };

// Lightweight shape for the index grid AND the personalization picker the main
// session builds on top of this lib — keep it clean and stable.
export type SectorSummary = {
  slug: string; // == sector_intel._id
  // The archive keys every sector by its English CISA name in BOTH languages
  // (even the AZ prose reads "<Name> sektorunu ..."), so name_az === name_en. We
  // surface both keys for a stable picker contract without inventing a
  // translation the source does not carry.
  name_az: string;
  name_en: string;
  actorCount: number; // grounded: == threat_actors with this sectors_canonical
};

export type Sector = SectorSummary & {
  who: { az: string; en: string };
  ttps: { az: string; en: string };
  defense: { az: string[]; en: string[] };
  topActorNames: string[];
  techniques: SectorTechnique[];
};

// The full hub: the sector plus its resolved, linkable actor dossiers.
export type SectorHub = Sector & { actors: ThreatActor[] };

type Intel = { who?: unknown; ttps?: unknown; defense?: unknown };
type SectorIntelDoc = {
  _id: string;
  sector?: string;
  actor_count?: number;
  az?: Intel;
  en?: Intel;
  top_actors?: unknown;
  top_techniques?: unknown;
};

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : [];
const norm = (s: string): string => s.trim().toLowerCase();

function toTechniques(v: unknown): SectorTechnique[] {
  if (!Array.isArray(v)) return [];
  const out: SectorTechnique[] = [];
  for (const t of v) {
    if (!t || typeof t !== "object") continue;
    const rec = t as Record<string, unknown>;
    const id = str(rec.id);
    if (!id) continue; // id is the load-bearing field (links to attack.mitre.org)
    const count = typeof rec.count === "number" ? rec.count : 0;
    out.push({ id, name: str(rec.name), count });
  }
  return out;
}

function shape(doc: SectorIntelDoc): Sector | null {
  const slug = str(doc._id);
  const name = str(doc.sector);
  if (!slug || !name) return null; // unusable without a stable key + display name
  return {
    slug,
    name_az: name,
    name_en: name,
    actorCount: typeof doc.actor_count === "number" ? doc.actor_count : 0,
    who: { az: str(doc.az?.who), en: str(doc.en?.who) },
    ttps: { az: str(doc.az?.ttps), en: str(doc.en?.ttps) },
    defense: { az: strArr(doc.az?.defense), en: strArr(doc.en?.defense) },
    topActorNames: strArr(doc.top_actors),
    techniques: toTechniques(doc.top_techniques),
  };
}

// Roster is 11 docs, refreshed on the engine's cadence — cache it so the index,
// the hubs, and generateStaticParams don't each re-hit Mongo during a build.
let sectorCache: { at: number; list: Sector[] } | null = null;
const TTL_MS = 60 * 60_000;

async function allSectors(): Promise<Sector[]> {
  if (sectorCache && Date.now() - sectorCache.at < TTL_MS) return sectorCache.list;
  let list: Sector[] = [];
  try {
    const db = await getDb();
    const docs = await db
      .collection<SectorIntelDoc>("sector_intel")
      .find({})
      .toArray();
    list = docs
      .map(shape)
      .filter((s): s is Sector => s !== null)
      // Most-targeted first — the honest default ordering (grounded actorCount).
      .sort(
        (a, b) =>
          b.actorCount - a.actorCount || a.name_en.localeCompare(b.name_en, "en"),
      );
  } catch {
    list = []; // DB unreachable → callers render their empty state.
  }
  sectorCache = { at: Date.now(), list };
  return list;
}

export async function getSectors(): Promise<SectorSummary[]> {
  const list = await allSectors();
  return list.map(({ slug, name_az, name_en, actorCount }) => ({
    slug,
    name_az,
    name_en,
    actorCount,
  }));
}

// Unique slugs for generateStaticParams. _id is unique by definition, but the Set
// guards the contract (zero duplicate slugs) regardless of source data.
export async function getSectorSlugs(): Promise<string[]> {
  const list = await allSectors();
  return [...new Set(list.map((s) => s.slug))];
}

// name / _id / alias → canonical actor _id, built once from a light projection so
// a sector's `top_actors` name strings resolve to real /actors/[slug] dossiers.
// name and _id are authoritative; aliases only fill gaps (never overwrite a hit),
// mirroring the search precedence in cti/actors.
type ActorRef = { _id: string; name?: string; aliases?: string[] };
let idxCache: { at: number; byKey: Map<string, string> } | null = null;

async function actorIdIndex(): Promise<Map<string, string>> {
  if (idxCache && Date.now() - idxCache.at < TTL_MS) return idxCache.byKey;
  const byKey = new Map<string, string>();
  try {
    const db = await getDb();
    const refs = await db
      .collection<ActorRef>("threat_actors")
      .find({}, { projection: { _id: 1, name: 1, aliases: 1 } })
      .toArray();
    for (const r of refs) {
      const nk = norm(str(r.name));
      if (nk && !byKey.has(nk)) byKey.set(nk, r._id);
      const ik = norm(r._id);
      if (ik && !byKey.has(ik)) byKey.set(ik, r._id);
    }
    for (const r of refs) {
      for (const al of r.aliases ?? []) {
        const ak = norm(str(al));
        if (ak && !byKey.has(ak)) byKey.set(ak, r._id);
      }
    }
  } catch {
    // leave empty → the hub's actor section simply renders nothing.
  }
  idxCache = { at: Date.now(), byKey };
  return byKey;
}

// Resolve the sector's top actors to dossiers, preserving the grounded ranking,
// de-duping by resolved id, and silently skipping any name that doesn't resolve
// (never 404). Uses getActorById so the canonical dossier fetch stays in one place.
async function resolveActors(names: string[]): Promise<ThreatActor[]> {
  if (!names.length) return [];
  const idx = await actorIdIndex();
  // Resolve + de-dupe names → ids first (order-preserving), then fetch the
  // dossiers in PARALLEL. Sequential await-in-loop meant one indexed findOne
  // per top actor, back to back (~6s for a 15-actor sector); one wave is ~one.
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const nm of names) {
    const id = idx.get(norm(nm));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  const resolved = await Promise.all(ids.map((id) => getActorById(id)));
  return resolved.filter((a): a is ThreatActor => Boolean(a));
}

export async function getSector(slug: string): Promise<SectorHub | null> {
  const list = await allSectors();
  const sector = list.find((s) => s.slug === slug);
  if (!sector) return null;
  const actors = await resolveActors(sector.topActorNames);
  return { ...sector, actors };
}
