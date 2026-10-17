import { getActorByIdCached } from "@/lib/threatactors";
import { canonicalActorId } from "@/lib/actor-aliases";
import { citedActorBundle } from "@/lib/cited";
import { getActorCitationsPage } from "@/lib/cited-data";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";
import { ttlMemo } from "@/lib/memo";
import { pageParam, stixBundleResponse } from "@/lib/taxii-http";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /api/v1/stix/actors/{id} — one actor's CITED intelligence as a STIX 2.1
// bundle: the intrusion-set, the CVEs it exploits, the techniques it uses
// and the indicators that indicate it, every relationship carrying the source
// URL and the quoted sentence it rests on (lib/cited.ts).
//
// Not the dossier bundle (/actors/{id}/stix.json, the roster's own record):
// this one holds only what a report we can link to says, sentence by sentence.
// The two share the intrusion-set and attack-pattern ids, so they merge.
//
// Paged at 400 citations (≤ 803 objects); Link: rel="next" names the next page.
// ---------------------------------------------------------------------------
const buildBundle = ttlMemo(
  async (id: string, page: number) => {
    const actor = await getActorByIdCached(id);
    if (!actor) return null;
    const { rows, pages } = await getActorCitationsPage(id, page);
    if (page > pages) return { bundle: null, pages };
    return { bundle: citedActorBundle(actor, rows, page), pages };
  },
  300_000,
  64,
);

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!limitCaller(req, "apiv1stix", 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw).toLowerCase();
  const canon = canonicalActorId(id);
  if (canon !== id) {
    const url = new URL(req.url);
    return Response.redirect(absoluteUrl(`/api/v1/stix/actors/${canon}${url.search}`), 308);
  }
  const page = pageParam(req);
  if (page === null) return jsonError(400, "`page` must be a positive integer.");

  let built;
  try {
    built = await buildBundle(id, page);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not a missing actor.");
  }
  if (!built) return jsonError(404, `No dossier with id "${id}". The roster is at /api/v1/actors.`);
  if (!built.bundle) return jsonError(404, `Page ${page} is past the last page (${built.pages}).`);
  return stixBundleResponse(req, built.bundle, { page, pages: built.pages }, `${id}-cited-stix${page > 1 ? `-p${page}` : ""}.json`);
}
