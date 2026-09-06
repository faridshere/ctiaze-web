import { getStories } from "@/lib/stories";
import { completeSentences } from "@/lib/format";
import { storyUrl } from "@/lib/site";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
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
  kev: boolean;
  cve_ids: string[];
  region_relevant: boolean;
  published_at: string;
  exposure: { product: string; worldwide: number | null; measured_at: string | null } | null;
  also_reported_by: string[];
};

function toApiItem(s: Story): ApiItem {
  const summary = completeSentences(s.summaryEn);
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
    kev: s.kev,
    cve_ids: s.cveIds,
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
  const since = q.get("since");
  const sinceMs = since ? Date.parse(since) : NaN;
  if (since && Number.isNaN(sinceMs)) {
    return jsonError(400, "`since` must be an ISO 8601 date, e.g. 2026-09-01");
  }

  // Pull a wider window than `limit` so filters have something to bite on.
  const stories = await getStories(500).catch(() => []);
  let items = stories;
  if (wantKev) items = items.filter((s) => s.kev);
  if (cve) items = items.filter((s) => s.cveIds.some((c) => c.toUpperCase() === cve));
  if (category) items = items.filter((s) => s.category.toLowerCase() === category);
  if (!Number.isNaN(sinceMs)) items = items.filter((s) => Date.parse(s.publishedAt) >= sinceMs);

  const page = items.slice(0, limit).map(toApiItem);

  return new Response(
    JSON.stringify(
      {
        schema: "https://skopnix.com/api/v1/items",
        version: 1,
        generated_at: new Date().toISOString(),
        count: page.length,
        total_matching: items.length,
        filters: { kev: wantKev, cve: cve || null, category: category || null, since: since || null, limit },
        items: page,
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*", // read-only public data
      },
    }
  );
}
