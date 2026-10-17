import { getDb } from "./db";
import type { CveActorCitationDoc } from "./citations";

// Reads of the engine's `cve_actor_citations` collection (2026-10-17). Shaping
// lives in lib/citations.ts so it can be tested without a database. Both reads
// are a single equality match on one field, capped, with only the fields the
// pages and the API print.
//
// Callers own the caching: the /cve page runs this inside its 12 h cve-hub
// unstable_cache and the dossier inside its daily ISR, so neither adds work per
// request (and neither wraps another unstable_cache: Next skips a nested one).

const PROJECTION = {
  cve: 1,
  actor_id: 1,
  actor_text: 1,
  relation: 1,
  quote: 1,
  url: 1,
  host: 1,
  kind: 1,
  model: 1,
  extracted_at: 1,
  kev: 1,
} as const;

// Enough for every citation a page can show (5 per CVE or per actor) many times
// over; a runaway extractor cannot turn one render into an unbounded read.
const CAP = 200;

async function collection() {
  const db = await getDb();
  return db.collection<CveActorCitationDoc>("cve_actor_citations");
}

/** Every citation of one CVE, newest first. `cve` must already be normalised (upper case). */
export async function getCitationsForCve(cve: string): Promise<CveActorCitationDoc[]> {
  const col = await collection();
  return (await col.find({ cve }, { projection: PROJECTION }).sort({ extracted_at: -1 }).limit(CAP).toArray()) as CveActorCitationDoc[];
}

/** Every citation naming one actor, newest first. */
export async function getCitationsForActor(actorId: string): Promise<CveActorCitationDoc[]> {
  const col = await collection();
  return (await col
    .find({ actor_id: actorId }, { projection: PROJECTION })
    .sort({ extracted_at: -1 })
    .limit(CAP)
    .toArray()) as CveActorCitationDoc[];
}
