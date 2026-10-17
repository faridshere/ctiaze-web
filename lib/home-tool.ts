import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { withSnapshot } from "./snapshot";
import { epssMap } from "./cveintel";
import { getActorNamesFor } from "./threatactors";
import { CITATION_PROJECTION, citationActorId, normCve } from "./citations";
import { kevCatalog } from "./stack/server";
import { getAzBoard } from "./az";
import { exampleCveIds, pickExample, type KevFact, type StackExample } from "./stack/example";

// The front page's tool furniture (2026-10-17): the stack check's pre-run
// example and the one-line pipeline health under it. Both are hourly blobs
// behind Next's data cache, like lib/home-data.ts, and both are kept as a
// last-good file (lib/snapshot.ts): when Mongo, CISA or FIRST cannot be read,
// the previous blob is served with its own generatedAt, so the page never
// claims to be fresher than it is. Nothing here runs per request, and nothing
// here calls NVD.

const DAY = 86_400_000;
// The newest citations are read deep enough that a handful of them still
// qualify (KEV-listed, EPSS known) after the filter.
const EXAMPLE_CANDIDATES = 400;

async function computeExample(): Promise<StackExample> {
  const db = await getDb();
  const citations = await db
    .collection("cve_actor_citations")
    .find({ quote: { $type: "string" }, url: { $type: "string" } })
    .sort({ extracted_at: -1 })
    .limit(EXAMPLE_CANDIDATES)
    .project(CITATION_PROJECTION)
    .toArray();

  // CISA's catalogue names the product the example is "for". If it cannot be
  // read the example is not guessed: the throw serves the last-good copy.
  const catalog = await kevCatalog();
  const kev = new Map<string, KevFact>();
  for (const [cve, e] of catalog.entries) kev.set(cve, { vendor: e.vendor, product: e.product, dateAdded: e.dateAdded, ransomware: e.ransomware });

  const ids = exampleCveIds(citations, kev);
  if (!ids.length) throw new Error("stack example: no KEV-listed cited CVE among the newest citations");

  // EPSS: the pipeline's own score on a single-CVE dispatch first (the same
  // rule lib/stack/server.ts applies), then one batched FIRST request.
  const epss = new Map<string, number>();
  const items = await db
    .collection<{ cve_ids?: string[]; epss?: number }>("items")
    .find({ cve_ids: { $in: ids } }, { projection: { cve_ids: 1, epss: 1 } })
    .limit(2000)
    .toArray();
  for (const it of items) {
    if (it.cve_ids?.length !== 1 || typeof it.epss !== "number" || !(it.epss > 0)) continue;
    const id = it.cve_ids[0].toUpperCase();
    epss.set(id, Math.max(epss.get(id) ?? 0, it.epss));
  }
  const missing = ids.filter((c) => !epss.has(c));
  if (missing.length) for (const [c, v] of await epssMap(missing)) if (Number.isFinite(v)) epss.set(c, v);

  const actorIds = [...new Set(citations.map((c) => (typeof c.actor_id === "string" ? citationActorId(c.actor_id) : "")).filter(Boolean))];
  const names = await getActorNamesFor(actorIds).catch(() => new Map<string, string>());

  const example = pickExample(citations, kev, epss, names, new Date());
  if (!example) throw new Error("stack example: no candidate carries KEV, EPSS, an actor and a quoted source");
  return example;
}

export const getStackExample = unstable_cache(() => withSnapshot("stack-example", computeExample), ["stack-example-v1"], { revalidate: 3600 });

export type PipelineHealth = {
  /** Distinct sources that delivered at least one item to the pipeline in the last 24 h. */
  sources24h: number;
  /** Distinct (CVE, actor) pairs carrying a quote and an http(s) source link. */
  citedPairs: number;
  generatedAt: string;
};

async function computeHealth(): Promise<PipelineHealth> {
  const db = await getDb();
  const now = new Date();
  const [sources, pairs] = await Promise.all([
    // Every fetched item, published or not: this is the intake, not the wire.
    // items.first_seen is indexed by the engine (cti/store.py).
    db.collection("items").distinct("source", { first_seen: { $gte: new Date(now.getTime() - DAY) } }),
    db
      .collection("cve_actor_citations")
      .aggregate<{ _id: { cve: string; actor: string } }>([
        { $match: { quote: { $type: "string" }, url: { $regex: "^https?://", $options: "i" } } },
        { $match: { $expr: { $and: [{ $eq: [{ $type: "$cve" }, "string"] }, { $eq: [{ $type: "$actor_id" }, "string"] }] } } },
        { $group: { _id: { cve: { $toUpper: { $trim: { input: "$cve" } } }, actor: { $toLower: { $trim: { input: "$actor_id" } } } } } },
      ])
      .toArray(),
  ]);
  // Aliases fold into their canonical dossier id, as everywhere else on the site.
  const distinct = new Set<string>();
  for (const p of pairs) {
    const cve = normCve(p._id.cve);
    const actor = citationActorId(p._id.actor);
    if (cve && actor) distinct.add(`${cve}|${actor}`);
  }
  return { sources24h: sources.filter((s) => typeof s === "string" && s).length, citedPairs: distinct.size, generatedAt: now.toISOString() };
}

export const getPipelineHealth = unstable_cache(() => withSnapshot("pipeline-health", computeHealth), ["pipeline-health-v1"], { revalidate: 3600 });

// The regional desk reads the same board /az prints, but on the front page's
// hourly clock: /az's own five-minute cache (getAzBoardCached) would pull the
// whole front page's ISR interval down to five minutes. Its own last-good file.
export const getRegionalBoard = unstable_cache(() => withSnapshot("home-az-board", getAzBoard), ["home-az-board-v1"], { revalidate: 3600 });
