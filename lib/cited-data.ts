import type { Document } from "mongodb";
import { getDb } from "./db";
import { ACTOR_ALIAS_CANONICAL, canonicalActorId } from "./actor-aliases";
import { PUBLIC_FILTER, toRow as toClaimRow, type ClaimDoc } from "./claims";
import { CREATED } from "./stix";
import { claimObjects, objectsFor, assertionsFor, type CitedRows, type CveCitation, type IocCitation, type TtpCitation } from "./cited";
import type { Cursor, ObjectsQuery, SourceRead, StreamItem } from "./taxii";
import { streamStart } from "./taxii";
import type { ThreatActor } from "./threatactors";

// ---------------------------------------------------------------------------
// Reads behind the cited-intel exports (STIX, TAXII, MISP). Every read is
// bounded: a page of rows, never a collection. The transforms are in
// lib/cited.ts, lib/taxii.ts and lib/misp.ts and never touch the database.
//
// Actor ids in citation rows are folded onto the canonical dossier the same
// way the pages fold them (lib/actor-aliases.ts), so an alias id cannot make a
// second intrusion-set for one group.
// ---------------------------------------------------------------------------

/** Citation rows per STIX bundle page. 400 rows → at most 2 objects each + 3. */
export const ROWS_PER_PAGE = 400;
// How many rows an actor's MISP event is built from (newest first). The event
// itself keeps at most 1000 attributes; this only bounds the read.
const MISP_ROWS = 5000;

const ACTOR_PROJECTION = { ml: 0, description_az: 0 } as const;

/** The canonical id plus every alias id that folds onto it. */
function idsFor(canonical: string): string[] {
  return [canonical, ...Object.entries(ACTOR_ALIAS_CANONICAL).filter(([, c]) => c === canonical).map(([a]) => a)];
}

function canon<T extends { actor_id: string | null }>(row: T): T {
  return row.actor_id ? { ...row, actor_id: canonicalActorId(row.actor_id) } : row;
}

export async function getActorsByIds(ids: string[]): Promise<Map<string, ThreatActor>> {
  const out = new Map<string, ThreatActor>();
  const unique = [...new Set(ids)];
  if (!unique.length) return out;
  const db = await getDb();
  const docs = (await db
    .collection<ThreatActor>("threat_actors")
    .find({ _id: { $in: unique } }, { projection: ACTOR_PROJECTION })
    .toArray()) as ThreatActor[];
  for (const a of docs) out.set(a._id, a);
  return out;
}

// The date a row was added, the same rule as citedAt() in lib/cited.ts but
// computed in the database so it can be filtered and sorted on. The result is
// written back into extracted_at so the transform reads the identical instant.
const AT_FIELDS = {
  _at: {
    $ifNull: [
      { $convert: { input: "$extracted_at", to: "date", onError: null, onNull: null } },
      { $convert: { input: "$_id", to: "date", onError: new Date(CREATED), onNull: new Date(CREATED) } },
    ],
  },
  _sid: { $toString: "$_id" },
};

type Stamped = { _at: Date; _sid: string };

function restamp<T extends { extracted_at?: Date | string | null }>(row: T & Stamped): T {
  return { ...row, extracted_at: row._at };
}

/** Rows strictly after `start` in (date, source, id) order, for source `k`. */
function afterCursor(start: Cursor | null, k: number): Document {
  if (!start) return {};
  const at = new Date(start.at);
  if (k > start.k) return { _at: { $gte: at } };
  if (k < start.k) return { _at: { $gt: at } };
  return { $or: [{ _at: { $gt: at } }, { _at: at, _sid: { $gt: start.sid } }] };
}

// --- STIX bundle pages ----------------------------------------------------------

export type Paged<T> = { rows: T; page: number; pages: number; total: number };

/**
 * One page of an actor's citations, CVEs first, then techniques, then
 * indicators, each in insertion order — a stable order, so page N is the same
 * rows on every pull until new citations land at the end.
 */
export async function getActorCitationsPage(actorId: string, page: number): Promise<Paged<CitedRows>> {
  const db = await getDb();
  const filter = { actor_id: { $in: idsFor(actorId) } };
  const names = ["cve_actor_citations", "actor_ttps_cited", "actor_iocs_cited"] as const;
  const counts = await Promise.all(names.map((n) => db.collection(n).countDocuments(filter)));
  const total = counts.reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));

  // The page's window over the three collections laid end to end.
  let from = (page - 1) * ROWS_PER_PAGE;
  let want = ROWS_PER_PAGE;
  const reads = names.map((n, i) => {
    const skip = Math.min(from, counts[i]);
    const take = Math.max(0, Math.min(want, counts[i] - skip));
    from = Math.max(0, from - counts[i]);
    want -= take;
    if (!take) return Promise.resolve([] as Document[]);
    return db
      .collection(n)
      .aggregate([{ $match: filter }, { $sort: { _id: 1 } }, { $skip: skip }, { $limit: take }, { $addFields: AT_FIELDS }])
      .toArray();
  });
  const [cves, ttps, iocs] = await Promise.all(reads);
  return {
    rows: {
      cves: cves.map((r) => canon(restamp(r as CveCitation & Stamped))),
      ttps: ttps.map((r) => canon(restamp(r as TtpCitation & Stamped))),
      iocs: iocs.map((r) => canon(restamp(r as IocCitation & Stamped))),
    },
    page,
    pages,
    total,
  };
}

/** One page of the citations naming a CVE, with the dossiers they point at. */
export async function getCveCitationsPage(
  cve: string,
  page: number,
): Promise<Paged<CveCitation[]> & { actors: Map<string, ThreatActor> }> {
  const db = await getDb();
  const col = db.collection("cve_actor_citations");
  // Matched as stored and lower-cased; normalizeCve() upper-cases on the way out.
  const filter = { cve: { $in: [cve, cve.toLowerCase()] } };
  const total = await col.countDocuments(filter);
  const docs = await col
    .aggregate([
      { $match: filter },
      { $sort: { _id: 1 } },
      { $skip: (page - 1) * ROWS_PER_PAGE },
      { $limit: ROWS_PER_PAGE },
      { $addFields: AT_FIELDS },
    ])
    .toArray();
  const rows = docs.map((r) => canon(restamp(r as CveCitation & Stamped)));
  const actors = await getActorsByIds(rows.map((r) => r.actor_id).filter((x): x is string => !!x));
  return { rows, actors, page, pages: Math.max(1, Math.ceil(total / ROWS_PER_PAGE)), total };
}

// --- TAXII streams ----------------------------------------------------------------

async function readSource(
  name: string,
  k: number,
  start: Cursor | null,
  limit: number,
  match: Document = {},
  atField: Document = AT_FIELDS,
): Promise<{ docs: (Document & Stamped)[]; truncated: boolean }> {
  const db = await getDb();
  const docs = (await db
    .collection(name)
    .aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $addFields: atField },
      { $match: afterCursor(start, k) },
      { $sort: { _at: 1, _sid: 1 } },
      // One more than a page, so the caller knows whether the source has more.
      { $limit: limit + 2 },
    ])
    .toArray()) as (Document & Stamped)[];
  const truncated = docs.length > limit + 1;
  return { docs: truncated ? docs.slice(0, limit + 1) : docs, truncated };
}

const position = (d: Stamped, k: number) => ({ at: d._at.toISOString(), k, sid: d._sid });

/** The cited-intel collection's next rows, built into STIX objects. */
export async function readCitedIntel(q: ObjectsQuery): Promise<SourceRead[]> {
  const start = streamStart(q);
  const [cves, ttps, iocs] = await Promise.all([
    readSource("cve_actor_citations", 0, start, q.limit),
    readSource("actor_ttps_cited", 1, start, q.limit),
    readSource("actor_iocs_cited", 2, start, q.limit),
  ]);
  const ids = [...cves.docs, ...ttps.docs, ...iocs.docs]
    .map((d) => (typeof d.actor_id === "string" ? canonicalActorId(d.actor_id) : null))
    .filter((x): x is string => !!x);
  const actors = await getActorsByIds(ids);

  // A row that yields nothing (no dossier, no URL, malformed) still occupies
  // its stream position, so paging moves past it instead of re-reading it.
  const build = (k: number, docs: (Document & Stamped)[], rows: (d: Document & Stamped) => CitedRows): StreamItem[] =>
    docs.map((d) => ({
      ...position(d, k),
      objects: objectsFor(assertionsFor(rows(d), actors)).map((o) => o.object),
    }));
  const empty = { cves: [], ttps: [], iocs: [] };
  return [
    {
      items: build(0, cves.docs, (d) => ({ ...empty, cves: [canon(restamp(d as unknown as CveCitation & Stamped))] })),
      truncated: cves.truncated,
    },
    {
      items: build(1, ttps.docs, (d) => ({ ...empty, ttps: [canon(restamp(d as unknown as TtpCitation & Stamped))] })),
      truncated: ttps.truncated,
    },
    {
      items: build(2, iocs.docs, (d) => ({ ...empty, iocs: [canon(restamp(d as unknown as IocCitation & Stamped))] })),
      truncated: iocs.truncated,
    },
  ];
}

/** The az-claims collection's next rows: the public claims, by when we first saw them. */
export async function readAzClaims(q: ObjectsQuery): Promise<SourceRead[]> {
  const start = streamStart(q);
  const { docs, truncated } = await readSource("hacktivist_posts", 0, start, q.limit, PUBLIC_FILTER, {
    _at: "$first_seen",
    _sid: { $toString: "$_id" },
  });
  return [
    {
      items: docs.map((d) => ({ ...position(d, 0), objects: claimObjects(toClaimRow(d as unknown as ClaimDoc)) })),
      truncated,
    },
  ];
}

// --- MISP -----------------------------------------------------------------------

const CITED_URL = { url: { $regex: /^https?:\/\//i } };

/** Every actor with a cited CVE or indicator, and the instant of its newest citation. */
export async function getMispActors(): Promise<{ actor: ThreatActor; latest: string }[]> {
  const db = await getDb();
  const latestBy = async (name: string) =>
    db
      .collection(name)
      .aggregate<{ _id: string; latest: Date }>([
        { $match: { actor_id: { $type: "string" }, ...CITED_URL } },
        { $addFields: AT_FIELDS },
        { $group: { _id: "$actor_id", latest: { $max: "$_at" } } },
      ])
      .toArray();
  const [a, b] = await Promise.all([latestBy("cve_actor_citations"), latestBy("actor_iocs_cited")]);
  const latest = new Map<string, Date>();
  for (const r of [...a, ...b]) {
    const id = canonicalActorId(r._id);
    const prev = latest.get(id);
    if (!prev || r.latest > prev) latest.set(id, r.latest);
  }
  const actors = await getActorsByIds([...latest.keys()]);
  return [...actors.values()]
    .map((actor) => ({ actor, latest: latest.get(actor._id)!.toISOString() }))
    .sort((x, y) => (x.actor._id < y.actor._id ? -1 : 1));
}

/** One actor's cited CVEs and indicators for its MISP event, newest first. */
export async function getMispRows(actorId: string): Promise<{ cves: CveCitation[]; iocs: IocCitation[] }> {
  const db = await getDb();
  const read = (name: string) =>
    db
      .collection(name)
      .aggregate([
        { $match: { actor_id: { $in: idsFor(actorId) }, ...CITED_URL } },
        { $addFields: AT_FIELDS },
        { $sort: { _at: -1, _sid: 1 } },
        { $limit: MISP_ROWS },
      ])
      .toArray();
  const [cves, iocs] = await Promise.all([read("cve_actor_citations"), read("actor_iocs_cited")]);
  return {
    cves: cves.map((r) => canon(restamp(r as CveCitation & Stamped))),
    iocs: iocs.map((r) => canon(restamp(r as IocCitation & Stamped))),
  };
}

