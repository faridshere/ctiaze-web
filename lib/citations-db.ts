import { getDb } from "./db";
import { actorIdsFor } from "./actor-aliases";
import { asCitationDocs, cappedCitationsPipeline, cveQueryValues, type CveActorCitationDoc } from "./citations";

// Reads of the engine's `cve_actor_citations` collection (2026-10-17). Shaping
// lives in lib/citations.ts so it can be tested without a database. Both reads
// match one indexed field ({cve:1} and {actor_id:1, extracted_at:-1} exist in
// production) with only the fields the pages and the API print.
//
// Callers own the caching: the /cve page runs this inside its 12 h cve-hub
// unstable_cache and the dossier inside its daily ISR, so neither adds work per
// request (and neither wraps another unstable_cache: Next skips a nested one).
//
// Errors are NOT swallowed here: an empty list cached for 12 h would hide every
// citation of a CVE after one transient Mongo blip. Each caller decides.

// Groups first, then caps (see cappedCitationsPipeline): enough for every
// citation a page can show (5 per CVE or per actor, plus the "more" count) on
// many groups, while a runaway extractor cannot turn one render into an
// unbounded read or let one hot CVE crowd out the rest.
const MAX_GROUPS = 48;
const PER_GROUP = 20;

async function collection() {
  const db = await getDb();
  return db.collection<CveActorCitationDoc>("cve_actor_citations");
}

/**
 * Every citation of one CVE, newest first within each actor. `cve` must be
 * normalised (upper case); the stored value is matched in either case.
 * Rows of the wrong shape are dropped (lib/citations.ts asCitationDoc).
 */
export async function getCitationsForCve(cve: string): Promise<CveActorCitationDoc[]> {
  const col = await collection();
  const docs = await col
    .aggregate(cappedCitationsPipeline({ cve: { $in: cveQueryValues(cve) } }, "actor_id", MAX_GROUPS, PER_GROUP))
    .toArray();
  return asCitationDocs(docs);
}

/**
 * Every citation naming one actor under any of its ids (the canonical id and
 * each alias that maps to it, lib/actor-aliases.ts), newest first within each CVE.
 */
export async function getCitationsForActor(actorId: string): Promise<CveActorCitationDoc[]> {
  const col = await collection();
  const docs = await col
    .aggregate(cappedCitationsPipeline({ actor_id: { $in: actorIdsFor(actorId) } }, "cve", MAX_GROUPS, PER_GROUP))
    .toArray();
  return asCitationDocs(docs);
}
