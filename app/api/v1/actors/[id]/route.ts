import { getActorByIdCached, splitTargets, type ThreatActor } from "@/lib/threatactors";
import { getWireMentions } from "@/lib/actor-wire";
import { canonicalActorId } from "@/lib/actor-aliases";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { absoluteUrl, storyUrl } from "@/lib/site";
import { etagFor, notModified } from "@/lib/etag";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /api/v1/actors/{id} — one dossier, as data. Everything here is what the
// cited sources state (MISP galaxy, MITRE ATT&CK, leak-site trackers) plus
// our own wire: the dispatches that named this actor in the last 90 days.
// Fields the engine has not computed for an actor are null, never guessed.
// ---------------------------------------------------------------------------
const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

// Optional enrichment the engine writes when it has run for an actor. Typed
// loosely on purpose: the site must not break when a field is absent.
type Enriched = ThreatActor & {
  reports?: { title: string; source?: string | null; date?: string | null; url: string }[];
  cves?: { cve: string; kev?: boolean; epss?: number | null; date?: string | null }[];
  activity_30d?: Record<string, unknown> | null;
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`apiv1actor:${clientIp(req)}`, 120, 60_000)) {
    return jsonError(429, "Too many requests — 120/min per IP.");
  }
  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw).toLowerCase();
  // Alias ids (unc2452 → apt29) point at the canonical dossier, the same way
  // the HTML pages do, so a client never gets two contradictory records.
  const canon = canonicalActorId(id);
  if (canon !== id) {
    return Response.redirect(absoluteUrl(`/api/v1/actors/${canon}`), 308);
  }

  let a: Enriched | null, wire;
  try {
    [a, wire] = await Promise.all([getActorByIdCached(id) as Promise<Enriched | null>, getWireMentions()]);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not a missing actor.");
  }
  if (!a) return jsonError(404, `No dossier with id "${id}". The roster is at /api/v1/actors.`);

  const { placed, other } = splitTargets(a);
  const mentions = wire.byActor[a._id] ?? [];

  const body = JSON.stringify(
    {
      schema: "https://skopnix.com/api/v1/actors/{id}",
      version: 1,
      generated_at: new Date().toISOString(),
      id: a._id,
      name: a.name,
      url: absoluteUrl(`/actors/${a._id}`),
      aliases: (a.aliases ?? []).filter((x) => x !== a.name),
      type: a.type ?? "unknown",
      origin_country: a.origin_country ?? null,
      state_sponsor: a.state_sponsor ?? null,
      mitre: a.mitre ?? null,
      description: a.description_en ?? null,
      targets: { countries: placed, other, sectors: a.targets_sectors ?? [] },
      techniques: (a.techniques ?? []).map((t) => ({ id: t.id, name: t.name, tactic: t.tactic ?? null })),
      malware: (a.malware ?? []).map((m) => m.name),
      tools: (a.tools ?? []).map((m) => m.name),
      victim_count: a.victim_count ?? null,
      first_seen: iso(a.first_seen),
      last_active: iso(a.last_active),
      related: (a.related_actors ?? []).map((r) => ({ id: r._id, name: r.name })),
      // Our own signal: dispatches on the wire that named this actor.
      on_wire: mentions.map((m) => ({ title: m.title, url: storyUrl(m.slug), published_at: m.at, kev: m.kev })),
      // Engine enrichment, present once the weekly refresh has computed it.
      reports: a.reports ?? null,
      cves: a.cves ?? null,
      activity_30d: a.activity_30d ?? null,
      sources: a.sources && a.sources.length ? a.sources : a.source ? [a.source] : [],
      refs: a.refs ?? [],
      last_refreshed: iso(a.last_refreshed),
    },
    null,
    2
  );
  const etag = etagFor(body);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      ETag: etag,
    },
  });
}
