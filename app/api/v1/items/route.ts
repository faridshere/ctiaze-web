import { queryStories } from "@/lib/stories";
import { kevSet } from "@/lib/cveintel";
import { CATEGORY_ORDER } from "@/lib/taxonomy";
import { etagFor, notModified } from "@/lib/etag";
import { completeSentences } from "@/lib/format";
import { storyUrl } from "@/lib/site";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { clusterStories, clusterId } from "@/lib/dedup";
import type { Story } from "@/lib/types";
import { ttlMemo } from "@/lib/memo";

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
// How many matching stories are read for clustering and paging. Bounded so one
// caller cannot ask the read connection to walk the whole collection.
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
  // When the story was published BY ITS SOURCE — the outlet's own date, falling
  // back to our dispatch time only when the source gave us none. This used to be
  // our Telegram post time, which made every item in a publish batch share one
  // timestamp and told a consumer nothing about when the news actually broke.
  // Sorting, `since` and `before` all run on this field.
  published_at: string;
  // When WE put it on the wire. Kept as its own field so the change above is
  // additive for anyone who was really measuring our dispatch latency.
  dispatched_at: string;
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
    dispatched_at: s.dispatchedAt,
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

type Query = {
  limit: number;
  wantKev: boolean;
  cve: string;
  category: string;
  since: string | null;
  sinceMs: number;
  before: string | null;
  beforeMs: number;
};

const buildBody = ttlMemo(async ({ limit, wantKev, cve, category, since, sinceMs, before, beforeMs }: Query): Promise<string> => {
  // The filters run in Mongo over the whole archive (lib/stories.ts
  // queryStories, 2026-10-10); this used to pull the newest WINDOW stories and
  // filter those, so ?kev=1 and ?cve= silently missed older items. WINDOW now
  // only caps how many MATCHING stories are read for clustering and paging.
  //
  // A database failure must stay an error, never `200 {count: 0}`: a rejection
  // here propagates to GET, which answers 503 (and ttlMemo does not cache it).
  const [{ stories: items, total }, kev] = await Promise.all([
    queryStories(
      {
        kev: wantKev,
        cve: cve || undefined,
        category: category || undefined,
        since: Number.isNaN(sinceMs) ? undefined : new Date(sinceMs),
        before: Number.isNaN(beforeMs) ? undefined : new Date(beforeMs),
      },
      WINDOW,
    ),
    kevSet().catch(() => new Set<string>()), // KEV outage degrades to item-level flags, never to an error
  ]);

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

  return JSON.stringify(
    {
      schema: "https://skopnix.com/api/v1/items",
      version: 1,
      generated_at: new Date().toISOString(),
      count: page.length,
      // Exact: the filters run in the database over the whole archive. The
      // window fields are kept for existing clients; the window now holds the
      // newest WINDOW *matching* stories, so it is complete whenever
      // total_matching fits in it.
      total_matching: total,
      matched_in_window: items.length,
      window: { size: WINDOW, stories_seen: items.length, complete: total <= WINDOW },
      filters: { kev: wantKev, cve: cve || null, category: category || null, since: since || null, before: before || null, limit },
      // Feed this back as ?before= to get the next, older page.
      next_before: page.length ? page[page.length - 1].published_at : null,
      items: page,
    },
    null,
    2
  );
}, 300_000, 32);

export async function GET(req: Request) {
  // Generous — this is meant to be used — but bounded so one caller can't pin
  // the read connection.
  if (!limitCaller(req, "apiv1", 60, 60_000)) {
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

  // One built body per distinct query for five minutes (lib/memo.ts): the same
  // window the CDN used to hold it for on Vercel. Also makes the ETag stable,
  // so a polling client's If-None-Match finally gets its 304 (generated_at
  // changed on every request before, so no two bodies ever matched).
  let body: string;
  try {
    body = await buildBody({ limit, wantKev, cve, category, since, sinceMs, before, beforeMs });
  } catch {
    return jsonError(503, "Upstream feed unavailable — this is an error, not an empty result.");
  }
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
