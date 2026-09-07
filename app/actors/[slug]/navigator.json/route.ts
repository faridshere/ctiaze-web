import { getActorByIdCached } from "@/lib/threatactors";
import { canonicalActorId } from "@/lib/actor-aliases";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";
import { etagFor, notModified } from "@/lib/etag";
import { navigatorLayer } from "@/lib/navigator";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /actors/{id}/navigator.json — the dossier's ATT&CK techniques as a
// Navigator layer, loadable straight into mitre-attack.github.io/attack-
// navigator. Sits next to the HTML dossier rather than under /api/v1 because
// it IS the page, in the format a defender's tooling reads.
//
// The layer is a coverage map, never a ranking — see lib/navigator.ts on why
// every technique carries the same score.
// ---------------------------------------------------------------------------
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  // Tighter than /api/v1/actors/{id} (120/min): a 93-technique layer is an
  // order of magnitude more body per request than the dossier JSON.
  if (!rateLimit(`navlayer:${clientIp(req)}`, 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }

  const { slug } = await ctx.params;
  const id = decodeURIComponent(slug).toLowerCase();
  // Alias ids point at the canonical dossier, exactly as the HTML page and the
  // JSON API do, so nobody ends up holding two layers for one group.
  const canon = canonicalActorId(id);
  if (canon !== id) {
    return Response.redirect(absoluteUrl(`/actors/${canon}/navigator.json`), 308);
  }

  let actor;
  try {
    actor = await getActorByIdCached(id);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not a missing actor.");
  }
  if (!actor) return jsonError(404, `No dossier with id "${id}". The roster is at /api/v1/actors.`);

  const layer = navigatorLayer(actor);
  // An actor with no techniques would produce a layer that loads perfectly and
  // shows an untouched matrix, which reads as "this group does nothing" rather
  // than "we have no ATT&CK mapping for it". 404 says the true thing.
  if (!layer) {
    return jsonError(
      404,
      `No ATT&CK techniques recorded for "${id}", so there is no layer to build. The dossier is at /api/v1/actors/${id}.`
    );
  }

  const body = JSON.stringify(layer, null, 2);
  const etag = etagFor(body);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      // Navigator's "open from URL" reads this inline; a browser "save as"
      // gets apt28-navigator.json instead of a file called navigator.json.
      "Content-Disposition": `inline; filename="${id}-navigator.json"`,
      ETag: etag,
    },
  });
}
