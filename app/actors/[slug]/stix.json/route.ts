import { getActorByIdCached } from "@/lib/threatactors";
import { canonicalActorId } from "@/lib/actor-aliases";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";
import { etagFor, notModified } from "@/lib/etag";
import { stixBundle } from "@/lib/stix";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /actors/{id}/stix.json — the dossier as a STIX 2.1 bundle: the group as
// an intrusion-set, its techniques as attack-patterns, its malware and tools,
// and the `uses` relationships between them. This is the shape a TIP or MISP
// instance ingests without anyone writing a parser for us.
//
// Object ids are deterministic (UUIDv5 — see lib/stix.ts), so re-fetching a
// week later produces a bundle that diffs cleanly against the last one
// instead of looking like an entirely new set of objects.
// ---------------------------------------------------------------------------
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  // Same budget as the Navigator layer: a bundle for a well-documented group
  // runs to a few hundred objects, far heavier than the dossier JSON's 120/min.
  if (!rateLimit(`stixbundle:${clientIp(req)}`, 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }

  const { slug } = await ctx.params;
  const id = decodeURIComponent(slug).toLowerCase();
  // Alias ids resolve to the canonical dossier, as everywhere else, so two
  // names for one group cannot become two intrusion-sets in someone's TIP.
  const canon = canonicalActorId(id);
  if (canon !== id) {
    return Response.redirect(absoluteUrl(`/actors/${canon}/stix.json`), 308);
  }

  let actor;
  try {
    actor = await getActorByIdCached(id);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not a missing actor.");
  }
  if (!actor) return jsonError(404, `No dossier with id "${id}". The roster is at /api/v1/actors.`);

  // Unlike the Navigator layer, a technique-less actor still makes a useful
  // bundle: the intrusion-set, its aliases and its references are the record.
  const body = JSON.stringify(stixBundle(actor), null, 2);
  const etag = etagFor(body);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "Content-Disposition": `inline; filename="${id}-stix.json"`,
      ETag: etag,
    },
  });
}
