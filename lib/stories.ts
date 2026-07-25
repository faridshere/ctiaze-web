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
