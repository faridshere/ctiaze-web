import type { MetadataRoute } from "next";
import { getStories } from "@/lib/stories";

export const revalidate = 21600;

// The public surface is the landing page plus the story pages the Telegram
// channel links to. Everything else was shelved under app/_disabled and now
// 404s, so it must not be advertised here — a sitemap full of 404s is worse
// than a small one: it wastes crawl budget and teaches crawlers to distrust it.
// Re-add a section here and in app/robots.ts together when a tool comes back.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://skopnix.com";
  const stories = await getStories(500).catch(() => []);
  const newest = stories[0] ? new Date(stories[0].publishedAt) : new Date();

  return [
    { url: base, lastModified: newest, changeFrequency: "daily", priority: 1 },
    ...stories.map((s) => ({
      url: `${base}/news/${s.slug}`,
      lastModified: new Date(s.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
