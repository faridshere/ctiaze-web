import type { Filter } from "mongodb";
import { getDb } from "./db";
import { toStory, type Story, type StoryDoc } from "./types";

// Only fully-published, non-retracted, real (non-stub) stories are ever shown —
// mirrors the exact gate the pipeline itself uses before anything reaches
// Telegram. The site is a second surface for the same trusted output, never a
// separate judgment call.
const PUBLISHED_FILTER: Filter<StoryDoc> = {
  published: true,
  retracted: { $ne: true },
  blocked_unsafe: { $ne: true },
  az_stub: { $ne: true },
};

async function items() {
  const db = await getDb();
  return db.collection<StoryDoc>("items");
}

export async function getStories(limit = 60): Promise<Story[]> {
  const col = await items();
  const docs = await col
    .find(PUBLISHED_FILTER)
    .sort({ published_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toStory);
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  // The slug is prefixed with the first 12 chars of the doc id (see slugify) —
  // enough to identify the exact document via a targeted regex, no full scan.
  const shortId = slug.split("-")[0].replace(/[^a-z0-9]/gi, "");
  if (!shortId) return null;
  const col = await items();
  const filter: Filter<StoryDoc> = {
    ...PUBLISHED_FILTER,
    _id: { $regex: `^(cve:|url:)${shortId}` },
  };
  const doc = await col.findOne(filter);
  return doc ? toStory(doc) : null;
}

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

const SITE = "https://ctiaze.tech";

// Public, machine-readable shape for feed.json / RSS / MCP consumers. Only
// fields that are safe and useful to expose — no internal scoring internals
// beyond what's already visible on the site. snake_case because this is an
// external data contract (matches the pipeline's own field naming).
export type FeedItem = {
  id: string;
  title_az: string;
  title_en: string;
  url: string; // stable permalink on ctiaze.tech
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
    url: `${SITE}/xeber/${s.slug}`,
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
      category: story.category,
      cveIds: story.cveIds,
    };
  });
}
