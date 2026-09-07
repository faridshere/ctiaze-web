import { cache } from "react";
import type { Filter } from "mongodb";
import { getDb } from "./db";
import { toStory, type Story, type StoryDoc } from "./types";
import { slugify, storyIdKey } from "./slug";
import { completeSentences } from "./format";
import { storyUrl } from "./site";

// Only fully-published, non-retracted, real (non-stub) stories are ever shown —
// mirrors the exact gate the pipeline itself uses before anything reaches
// Telegram. The site is a second surface for the same trusted output, never a
// separate judgment call.
export const PUBLISHED_FILTER: Filter<StoryDoc> = {
  published: true,
  retracted: { $ne: true },
  blocked_unsafe: { $ne: true },
  az_stub: { $ne: true },
};

async function items() {
  const db = await getDb();
  return db.collection<StoryDoc>("items");
}

// cache() dedupes within a single request: several pages call getStories twice per
// render (e.g. /cve runs getCveIndex(150) which itself calls getStories(150), plus
// getStories(150) directly; the story page runs getStoryBySlug in generateMetadata
// AND the body). Same args → one Mongo query, halving reads on the heaviest pages.
export const getStories = cache(async (limit = 60): Promise<Story[]> => {
  const col = await items();
  const docs = await col
    .find(PUBLISHED_FILTER)
    .sort({ published_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toStory);
});

// The same newest-first read, but starting strictly before a timestamp. Lets an
// API client page backwards through the archive instead of being stuck with
// whatever the newest window happened to hold.
export async function getStoriesBefore(before: Date, limit = 60): Promise<Story[]> {
  const col = await items();
  const docs = await col
    .find({ ...PUBLISHED_FILTER, published_at: { $lt: before } })
    .sort({ published_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toStory);
}

// Every published dispatch that names a CVE, newest first — the spine of the
// /cve hub. Reads the indexed array field directly rather than scanning a window.
export async function getStoriesForCve(cve: string, limit = 40): Promise<Story[]> {
  const col = await items();
  const docs = await col
    .find({ ...PUBLISHED_FILTER, cve_ids: cve.toUpperCase() })
    .sort({ published_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toStory);
}

// Paginated full archive (every published dispatch, newest first — including the
// ctiaze.tech-era backlog, which lives in the same collection). Not cache()-
// wrapped because the page varies; callers cache per-page with unstable_cache.
export async function getArchivePage(skip: number, limit: number): Promise<Story[]> {
  const col = await items();
  const docs = await col
    .find(PUBLISHED_FILTER)
    .sort({ published_at: -1 })
    .skip(Math.max(0, skip))
    .limit(limit)
    .toArray();
  return docs.map(toStory);
}

export const getStoryBySlug = cache(async (slug: string): Promise<Story | null> => {
  // storyIdKey() recovers the stable _id key slugify() embedded (first 12 chars of
  // the prefix-stripped id, minus any trailing join hyphen). See lib/slug.ts — the
  // trailing-hyphen strip is what keeps digest permalinks (11-char ids) resolving.
  const shortId = storyIdKey(slug);
  if (!shortId) return null;
  // escape regex metacharacters so the prefix match stays literal
  const escaped = shortId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const col = await items();
  const filter: Filter<StoryDoc> = {
    ...PUBLISHED_FILTER,
    _id: { $regex: `^(cve:|url:|digest:|spike:)${escaped}` },
  };

  // A 12-char key is a PREFIX, not an identity: a CVE id is 14+ chars, so
  // "CVE-2026-202" matches both CVE-2026-20200 and CVE-2026-20212. findOne()
  // returned whichever Mongo reached first, so five permalinks served a
  // different vulnerability than the URL named — fatal in a product whose whole
  // claim is "grounded to source". Collect every candidate and pick the one the
  // slug actually names; the full CVE lives in the title tail, so the regenerated
  // slug disambiguates exactly.
  const docs = await col.find(filter).limit(25).toArray();
  if (docs.length === 0) return null;
  if (docs.length === 1) return toStory(docs[0]);

  const exact = docs.find(
    (d) =>
      slugify(d._id, d.title || d.az_title || "news") === slug ||
      // pre-2026-09-07 permalinks were built from the Azerbaijani title
      slugify(d._id, d.az_title || d.title || "news") === slug
  );
  if (exact) return toStory(exact);

  // No exact match (a hand-typed or stale tail): choose deterministically by the
  // longest shared prefix rather than letting Mongo's ordering decide.
  const score = (d: StoryDoc) => {
    const cand = slugify(d._id, d.title || d.az_title || "news");
    let i = 0;
    while (i < cand.length && i < slug.length && cand[i] === slug[i]) i++;
    return i;
  };
  return toStory([...docs].sort((a, b) => score(b) - score(a))[0]);
});

export async function getStats() {
  const col = await items();
  const total = await col.countDocuments(PUBLISHED_FILTER);
  const kevCount = await col.countDocuments({ ...PUBLISHED_FILTER, kev: true });
  return { total, kevCount };
}

// Cheap poll target for the client-side live-update banner — just the count,
// compared against the count the page was server-rendered with.
export async function getLatestSignal(): Promise<{ count: number }> {
  const col = await items();
  const count = await col.countDocuments(PUBLISHED_FILTER);
  return { count };
}

// Public, machine-readable shape for feed.json / RSS / MCP consumers. Only
// fields that are safe and useful to expose — no internal scoring internals
// beyond what's already visible on the site. snake_case because this is an
// external data contract (matches the pipeline's own field naming).
export type FeedItem = {
  id: string;
  title_az: string;
  title_en: string;
  summary_az: string;   // so an AI agent has text to quote/ground on, not just a title
  summary_en: string;
  url: string; // stable permalink on skopnix.com
  source_url: string;
  category: string;
  severity: string | null;
  kev: boolean;
  cve_ids: string[];
  region_relevant: boolean;
  published_at: string; // ISO 8601
};

export async function getFeed(limit = 100): Promise<FeedItem[]> {
  const stories = await getStories(limit);
  return stories.map((s) => ({
    id: s.id,
    title_az: s.titleAz,
    title_en: s.titleEn,
    summary_az: s.bodyAz.slice(0, 300),
    summary_en: completeSentences(s.summaryEn.slice(0, 300)),
    url: storyUrl(s.slug),
    source_url: s.sourceUrl,
    category: s.category,
    severity: s.severity,
    kev: s.kev,
    cve_ids: s.cveIds,
    region_relevant: s.region,
    published_at: s.publishedAt,
  }));
}

export type SearchEntry = {
  slug: string;
  titleAz: string;
  titleEn: string;
  category: string;
  cveIds: string[];
};

// Lightweight index for the command palette — title/category/CVE only, never
// the full body, so the client-side fetch stays small even at a few hundred items.
export async function getSearchIndex(limit = 200): Promise<SearchEntry[]> {
  const col = await items();
  const docs = await col
    .find(PUBLISHED_FILTER)
    .sort({ published_at: -1 })
    .limit(limit)
    .project<Pick<StoryDoc, "_id" | "az_title" | "title" | "ai_category" | "cve_ids">>({
      _id: 1,
      az_title: 1,
      title: 1,
      ai_category: 1,
      cve_ids: 1,
    })
    .toArray();
  return docs.map((doc) => {
    const story = toStory(doc as StoryDoc);
    return {
      slug: story.slug,
      titleAz: story.titleAz,
      titleEn: story.titleEn,
      category: story.category,
      cveIds: story.cveIds,
    };
  });
}
