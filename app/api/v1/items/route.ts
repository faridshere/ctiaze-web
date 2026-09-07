import { getStories, getStoriesBefore } from "@/lib/stories";
import { kevSet } from "@/lib/cveintel";
import { CATEGORY_ORDER } from "@/lib/taxonomy";
import { etagFor, notModified } from "@/lib/etag";
import { completeSentences } from "@/lib/format";
import { storyUrl } from "@/lib/site";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { clusterStories, clusterId } from "@/lib/dedup";
import type { Story } from "@/lib/types";

export const revalidate = 300;

// ---------------------------------------------------------------------------
// GET /api/v1/items — the wire as data. No key, no signup.
//
// Exists because llms.txt and the site both advertised a schema (title_en,
// summary_en, region_relevant, published_at, severity…) that neither feed
// actually emitted — feed.json ships JSON Feed keys with a small _skopnix
// sidecar, and severity was null on all 434 stories. Documenting fields you
// don't serve is worse than serving none, so this route emits the documented
// shape and llms.txt now points here.
//
// Every value is pipeline-stamped. Nothing is inferred, and a field we cannot
// determine is null with the reason stated in the docs rather than guessed.
// ---------------------------------------------------------------------------
const MAX_LIMIT = 200;
// How many stories are pulled before filtering. Bounded so one caller cannot ask
// the read connection to walk the whole collection.
const WINDOW = 500;

type ApiItem = {
  id: string;
  url: string;
  source_url: string;
  title_en: string;
  title_az: string;
  summary_en: string;
  summary_az: string;
  truncated: boolean;
  category: string;
  severity: string | null;
  cvss: number | null;
  epss: number | null;
  // "any CVE on this item is on KEV". A Patch-Tuesday roundup naming 400 CVEs
  // is true here because of one of them; kev_cves says which, so nobody has to
  // treat all 400 as exploited. roundup flags such lists.
  kev: boolean;
  cve_ids: string[];
  kev_cves: string[];
  cves: { id: string; kev: boolean }[];
  roundup: boolean;
  region_relevant: boolean;
  published_at: string;
  exposure: { product: string; worldwide: number | null; measured_at: string | null } | null;
  also_reported_by: string[];
  // Same real-world event, different outlets. Dedup on this and cite the
  // individual id. Conservative by design: an exact shared CVE, or a strong
  // headline overlap inside 72h. Two outlets describing one event in completely
  // different words stay separate, because a false merge is worse than a dupe.
  cluster_id: string;
  is_duplicate: boolean;
};

const ROUNDUP_AT = 20;

function toApiItem(s: Story, cluster: { id: string; isDupe: boolean }, kev: Set<string>): ApiItem {
  const summary = completeSentences(s.summaryEn);
  const cves = s.cveIds.map((c) => c.toUpperCase()).map((id) => ({ id, kev: kev.has(id) }));
  const kevCves = cves.filter((c) => c.kev).map((c) => c.id);
  return {
    id: s.id,
    url: storyUrl(s.slug),
    source_url: s.sourceUrl,
    title_en: s.titleEn,
    title_az: s.titleAz,
    summary_en: summary,
    summary_az: s.bodyAz,
    // honest flag: the source feed cut the text, so we cut to a whole sentence
    truncated: summary.endsWith("…"),
    category: s.category,
    severity: s.severity,
    cvss: s.cvss,
    epss: s.epss,
    kev: s.kev || kevCves.length > 0,
    cve_ids: s.cveIds,
    kev_cves: kevCves,
    cves,
    roundup: cves.length >= ROUNDUP_AT,
    region_relevant: s.region,
    published_at: s.publishedAt,
    exposure: s.azExposure
      ? {
          product: s.azExposure.product,
          worldwide: s.azExposure.globalCount,
          measured_at: s.azExposure.globalAsOfIso || null,
        }
      : null,
    also_reported_by: s.altSources,
    cluster_id: cluster.id,
    is_duplicate: cluster.isDupe,
  };
}

export async function GET(req: Request) {
  // Generous — this is meant to be used — but bounded so one caller can't pin
  // the read connection.
  if (!rateLimit(`apiv1:${clientIp(req)}`, 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }

  const q = new URL(req.url).searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(q.get("limit") ?? "50", 10) || 50));
  const wantKev = q.get("kev") === "1" || q.get("kev") === "true";
  const cve = (q.get("cve") ?? "").trim().toUpperCase();
  const category = (q.get("category") ?? "").trim().toLowerCase();
  // A category we never emit used to return 200 with nothing, which reads as
  // "no news" rather than "you misspelt it".
  if (category && !(CATEGORY_ORDER as readonly string[]).includes(category)) {
    return jsonError(400, `\`category\` must be one of: ${CATEGORY_ORDER.join(", ")}`);
  }
  // Cursor: everything strictly before this instant. Pair with the oldest
  // published_at you received to page backwards through the archive.
  const before = q.get("before");
  // Date.parse() accepts a lot of implementation-defined junk, so a string that
  // violates the documented contract could still be accepted and then read
  // differently on another runtime. Require the shape we actually document.
  const since = q.get("since");
  const ISO = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
  const sinceMs = since ? Date.parse(since) : NaN;
  if (since && (!ISO.test(since) || Number.isNaN(sinceMs))) {
    return jsonError(400, "`since` must be an ISO 8601 date, e.g. 2026-09-01 or 2026-09-01T12:00:00Z");
  }
  const beforeMs = before ? Date.parse(before) : NaN;
  if (before && (!ISO.test(before) || Number.isNaN(beforeMs))) {
    return jsonError(400, "`before` must be an ISO 8601 date, e.g. 2026-08-01T00:00:00Z");
  }

  // Pull a wider window than `limit` so filters have something to bite on.
  //
  // This used to be `.catch(() => [])`, which turned a database outage into a
  // perfectly cheerful `200 {count: 0}`. A consumer then cannot tell "nothing
  // matched" from "the feed is down", and a polling client would quietly treat
  // an outage as an empty day. Fail loudly instead.
  let stories: Story[];
  let kev: Set<string>;
  try {
    [stories, kev] = await Promise.all([
      before ? getStoriesBefore(new Date(beforeMs), WINDOW) : getStories(WINDOW),
      kevSet().catch(() => new Set<string>()), // KEV outage degrades to item-level flags, never to an error
    ]);
  } catch {
    return jsonError(503, "Upstream feed unavailable — this is an error, not an empty result.");
  }
  let items = stories;
  if (wantKev) items = items.filter((s) => s.kev);
  if (cve) items = items.filter((s) => s.cveIds.some((c) => c.toUpperCase() === cve));
  if (category) items = items.filter((s) => s.category.toLowerCase() === category);
  if (!Number.isNaN(sinceMs)) items = items.filter((s) => Date.parse(s.publishedAt) >= sinceMs);

  // Cluster across the whole filtered set, then page — otherwise a duplicate
  // split across a page boundary would look unique.
  const clusters = clusterStories(
    items.map((s) => ({ id: s.id, title: s.titleEn || s.titleAz, publishedAt: s.publishedAt, cveIds: s.cveIds }))
  );
  const clusterOf = new Map<string, { id: string; isDupe: boolean }>();
  for (const c of clusters) {
    const cid = clusterId(c.lead);
    clusterOf.set(c.lead.id, { id: cid, isDupe: false });
    for (const o of c.others) clusterOf.set(o.id, { id: cid, isDupe: true });
  }

  const page = items
    .slice(0, limit)
    .map((s) => toApiItem(s, clusterOf.get(s.id) ?? { id: clusterId({ id: s.id, title: s.titleEn, publishedAt: s.publishedAt }), isDupe: false }, kev));

  const body = JSON.stringify(
      {
        schema: "https://skopnix.com/api/v1/items",
        version: 1,
        generated_at: new Date().toISOString(),
        count: page.length,
        // Honest about its own scope: this is the number that matched INSIDE the
        // window, not the number that exists. Reporting it as a total would be a
        // lie for any `since` reaching further back than the window covers.
        matched_in_window: items.length,
        window: { size: WINDOW, stories_seen: stories.length, complete: stories.length < WINDOW },
        filters: { kev: wantKev, cve: cve || null, category: category || null, since: since || null, before: before || null, limit },
        // Feed this back as ?before= to get the next, older page.
        next_before: page.length ? page[page.length - 1].published_at : null,
        items: page,
      },
      null,
      2
    );
  const etag = etagFor(body);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*", // read-only public data
      ETag: etag,
    },
  });
}
