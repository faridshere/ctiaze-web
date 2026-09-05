import { getStories } from "../stories";
import { extractIocs, type IocType } from "../ioc";

// Aggregates every machine-readable indicator that appears across recent
// published briefings into one list, each mapped back to the story/stories it
// came from — so an analyst gets "here is every IOC we've surfaced, and the news
// behind each one" in a single place. Extraction reuses the same conservative,
// defang-on-display regex the per-story panel uses; nothing is fetched or
// invented at this layer (live enrichment is layered on client-side, keyless).

export type IocRef = {
  type: IocType;
  value: string;
  defanged: string;
  stories: { slug: string; titleAz: string; titleEn: string; publishedAt: string }[];
};

export async function getIocFeed(limit = 150): Promise<IocRef[]> {
  const stories = await getStories(limit);
  const map = new Map<string, IocRef>();
  for (const s of stories) {
    const iocs = extractIocs(s.titleAz, s.titleEn, s.bodyAz);
    for (const i of iocs) {
      const key = `${i.type}:${i.value.toLowerCase()}`;
      const cur =
        map.get(key) ?? { type: i.type, value: i.value, defanged: i.defanged, stories: [] };
      if (!cur.stories.some((x) => x.slug === s.slug)) {
        cur.stories.push({ slug: s.slug, titleAz: s.titleAz, titleEn: s.titleEn, publishedAt: s.publishedAt });
      }
      map.set(key, cur);
    }
  }
  // Most-referenced first (an IOC seen across several briefings is the
  // higher-signal pivot), then most-recent.
  return [...map.values()].sort(
    (a, b) =>
      b.stories.length - a.stories.length ||
      (b.stories[0]?.publishedAt ?? "").localeCompare(a.stories[0]?.publishedAt ?? "")
  );
}

// Grouped-by-type view for the aggregation page.
export function groupIocsByType(refs: IocRef[]): { type: IocType; items: IocRef[] }[] {
  const order: IocType[] = ["ipv4", "domain", "url", "sha256", "sha1", "md5", "email", "btc", "eth"];
  const m = new Map<IocType, IocRef[]>();
  for (const r of refs) (m.get(r.type) ?? m.set(r.type, []).get(r.type)!).push(r);
  return order.filter((t) => m.has(t)).map((t) => ({ type: t, items: m.get(t)! }));
}
