import type { MetadataRoute } from "next";
import { getStories } from "@/lib/stories";
import { getActorIds } from "@/lib/threatactors";
import { SITE_URL, storyUrl } from "@/lib/site";

export const revalidate = 21600;

// The public surface is the landing page plus the story pages the Telegram
// channel links to. Everything else was shelved under app/_disabled and now
// 404s, so it must not be advertised here — a sitemap full of 404s is worse
// than a small one: it wastes crawl budget and teaches crawlers to distrust it.
// Re-add a section here and in app/robots.ts together when a tool comes back.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stories, actorIds] = await Promise.all([getStories(500).catch(() => []), getActorIds(5000).catch(() => [])]);
  const newest = stories[0] ? new Date(stories[0].publishedAt) : new Date();

  return [
    { url: SITE_URL, lastModified: newest, changeFrequency: "daily", priority: 1 },
    // These were missing entirely: the sitemap carried 434 story URLs and nothing
    // else, so /about, /actors and every actor dossier were invisible to search.
    { url: `${SITE_URL}/about`, lastModified: newest, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/api-docs`, lastModified: newest, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: newest, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/news`, lastModified: newest, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${SITE_URL}/actors`, lastModified: newest, changeFrequency: "weekly" as const, priority: 0.7 },
    // One hub per CVE the wire has named recently — the pages analysts search for.
    ...[...new Set(stories.flatMap((s) => s.cveIds.map((c) => c.toUpperCase())))].slice(0, 400).map((cve) => ({
      url: `${SITE_URL}/cve/${cve}`,
      lastModified: newest,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...actorIds.map((id) => ({
      url: `${SITE_URL}/actors/${id}`,
      lastModified: newest,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...stories.map((s) => ({
      url: storyUrl(s.slug),
      lastModified: new Date(s.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
