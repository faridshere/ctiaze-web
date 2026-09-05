import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { PUBLISHED_FILTER } from "./stories";
import { toStory, type StoryDoc } from "./types";
import { buildMatcher, matchKeys } from "./actor-match";

export { buildMatcher, matchKeys } from "./actor-match";

// Which actors our own wire has been talking about. The weekly ETL's join only
// looks at titles and tags and trusts every MISP alias (some are plain words like
// "global" or "payload"), so it finds almost nothing. This pass reads the last
// few hundred dispatches with a precise matcher and is refreshed hourly, so the
// "on the wire" signal is both current and ours.
export type WireMention = { slug: string; title: string; at: string; kev: boolean };
export type WireMentions = {
  byActor: Record<string, WireMention[]>;
  /** actors mentioned in the last 90 days, most mentions first */
  recent: { id: string; name: string; type: string; count: number; lastAt: string }[];
  generatedAt: string;
};

const STORIES = 400;
const PER_ACTOR = 10;
const RECENT_DAYS = 90;

async function computeWireMentions(): Promise<WireMentions> {
  const db = await getDb();
  const [actors, stories] = await Promise.all([
    db.collection("threat_actors").find({}, { projection: { name: 1, aliases: 1, type: 1 } }).toArray(),
    db
      .collection<StoryDoc>("items")
      .find(PUBLISHED_FILTER, { projection: { _id: 1, title: 1, az_title: 1, summary: 1, published_at: 1, kev: 1 } })
      .sort({ published_at: -1 })
      .limit(STORIES)
      .toArray(),
  ]);
  const matchers = actors
    .map((a) => ({ id: String(a._id), name: String(a.name ?? ""), type: String(a.type ?? "unknown"), re: buildMatcher(matchKeys(String(a.name ?? ""), (a.aliases as string[]) ?? [])) }))
    .filter((m): m is typeof m & { re: RegExp } => m.re !== null);

  const byActor: Record<string, WireMention[]> = {};
  for (const doc of stories) {
    const s = toStory(doc);
    const hay = `${doc.title ?? ""}\n${doc.summary ?? ""}`;
    if (!hay.trim()) continue;
    const mention: WireMention = { slug: s.slug, title: s.titleEn || s.titleAz, at: s.publishedAt, kev: s.kev };
    for (const m of matchers) {
      if (!m.re.test(hay)) continue;
      const list = (byActor[m.id] ??= []);
      if (list.length < PER_ACTOR) list.push(mention);
    }
  }
  const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
  const recent = matchers
    .map((m) => {
      const list = byActor[m.id] ?? [];
      const fresh = list.filter((x) => new Date(x.at).getTime() >= cutoff);
      return { id: m.id, name: m.name, type: m.type, count: fresh.length, lastAt: fresh[0]?.at ?? "" };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
  return { byActor, recent, generatedAt: new Date().toISOString() };
}

export const getWireMentions = unstable_cache(computeWireMentions, ["actor-wire-v1"], { revalidate: 3600 });
