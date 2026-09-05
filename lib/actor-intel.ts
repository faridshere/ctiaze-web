import { unstable_cache } from "next/cache";
import { getDb } from "./db";

// The engine's derived intelligence around an actor, read from the collections
// its batch jobs own: `actor_pack` (analyst brief, embedding neighbours),
// `mitre_techniques` (plain-English technique notes), `ttp_profiles` (which
// techniques matter most per target country/sector), and `graph` (how many
// roster actors share a technique or a piece of software). All deterministic
// or grounded outputs of data we already hold — nothing is inferred here.
export type SimilarActor = { id: string; name: string; score: number };
export type ActorPack = { intel: string | null; similar: SimilarActor[]; techniqueCount: number };

export type TechniqueNote = { id: string; name: string; tactic: string; en: string; usedBy: number };
export type TechniqueRef = Record<string, TechniqueNote>;

export type TtpProfile = { key: string; kind: "country" | "sector"; label: string; actors: number; ids: string[] };

export type SoftwareUsage = Record<string, number>; // "S0002" → distinct actors using it

const DAY = 86400;

async function readActorPack(id: string): Promise<ActorPack | null> {
  const db = await getDb();
  const doc = await db.collection("actor_pack").findOne({ _id: id } as never, { projection: { intel: 1, similar_actors: 1, technique_count: 1 } });
  if (!doc) return null;
  const intel = (doc as { intel?: { en?: string } }).intel?.en?.trim() || null;
  const similar = ((doc as { similar_actors?: SimilarActor[] }).similar_actors ?? [])
    .filter((s) => s && s.id && s.name)
    .slice(0, 6)
    .map((s) => ({ id: s.id, name: s.name, score: Number(s.score) || 0 }));
  return { intel, similar, techniqueCount: Number((doc as { technique_count?: number }).technique_count ?? 0) };
}
export const getActorPack = unstable_cache(readActorPack, ["actor-pack-v1"], { revalidate: DAY });

// Every technique any roster actor uses (360), with the engine's one-line note
// and how many roster actors the graph says use it — one blob, daily.
async function readTechniqueRef(): Promise<TechniqueRef> {
  const db = await getDb();
  const [notes, nodes] = await Promise.all([
    db.collection("mitre_techniques").find({}, { projection: { name: 1, tactic: 1, en: 1 } }).toArray(),
    db
      .collection("graph")
      .find({ type: "technique" }, { projection: { _id: 1, edges: 1 } })
      .toArray(),
  ]);
  const usedBy = new Map<string, number>();
  for (const n of nodes) {
    const id = String(n._id).replace(/^technique:/, "");
    const count = ((n as { edges?: { rel?: string }[] }).edges ?? []).filter((e) => e.rel === "used_by").length;
    usedBy.set(id.toUpperCase(), count);
  }
  const ref: TechniqueRef = {};
  for (const n of notes) {
    const id = String(n._id).toUpperCase();
    ref[id] = {
      id,
      name: String((n as { name?: string }).name ?? id),
      tactic: String((n as { tactic?: string }).tactic ?? ""),
      en: String((n as { en?: string }).en ?? ""),
      usedBy: usedBy.get(id) ?? 0,
    };
  }
  return ref;
}
export const getTechniqueRef = unstable_cache(readTechniqueRef, ["technique-ref-v1"], { revalidate: DAY });

async function readTtpProfiles(): Promise<TtpProfile[]> {
  const db = await getDb();
  const docs = await db.collection("ttp_profiles").find({}, { projection: { kind: 1, label: 1, actor_count: 1, top_techniques: 1 } }).toArray();
  return docs
    .map((d) => ({
      key: String(d._id),
      kind: (d as { kind?: string }).kind === "sector" ? ("sector" as const) : ("country" as const),
      label: String((d as { label?: string }).label ?? ""),
      actors: Number((d as { actor_count?: number }).actor_count ?? 0),
      ids: (((d as { top_techniques?: { techniqueID?: string }[] }).top_techniques ?? []).map((t) => String(t.techniqueID ?? "").toUpperCase()).filter(Boolean)),
    }))
    .filter((p) => p.label && p.ids.length > 0 && p.actors >= 2)
    .sort((a, b) => a.kind.localeCompare(b.kind) || b.actors - a.actors);
}
export const getTtpProfiles = unstable_cache(readTtpProfiles, ["ttp-profiles-v1"], { revalidate: DAY });

// Software nodes are keyed like "malware:id-s0023-name-chopstick"; index them by
// the ATT&CK software id so a chip can say "used by 14 actors".
async function readSoftwareUsage(): Promise<SoftwareUsage> {
  const db = await getDb();
  const nodes = await db.collection("graph").find({ type: { $in: ["malware", "tool"] } }, { projection: { _id: 1, edges: 1 } }).toArray();
  const out: SoftwareUsage = {};
  for (const n of nodes) {
    const m = String(n._id).match(/id-(s\d{4})/i);
    if (!m) continue;
    const count = ((n as { edges?: { rel?: string }[] }).edges ?? []).filter((e) => e.rel === "used_by").length;
    const key = m[1].toUpperCase();
    out[key] = Math.max(out[key] ?? 0, count);
  }
  return out;
}
export const getSoftwareUsage = unstable_cache(readSoftwareUsage, ["software-usage-v1"], { revalidate: DAY });
