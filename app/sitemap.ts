import type { MetadataRoute } from "next";
import { getStories } from "@/lib/stories";
import { getActorIds } from "@/lib/threatactors";

export const revalidate = 3600;

// Makes the /xeber/[slug] stories AND the /actors/[slug] dossiers discoverable to
// search + AI answer engines — the per-CVE Azerbaijani long-tail and the only
// Azerbaijani threat-actor dossier set in existence, where ctiaze can rank #1.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://ctiaze.tech";
  const [stories, actorIds] = await Promise.all([
    getStories(500).catch(() => []),
    getActorIds(800).catch(() => []),
  ]);
  const newest = stories[0] ? new Date(stories[0].publishedAt) : new Date();

  // Static pages: only the homepage carries a real lastModified (the newest story).
  // Stamping new Date() on every URL every run teaches Google to ignore our lastmod.
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}`, lastModified: newest, changeFrequency: "hourly", priority: 1 },
    ...["/cve", "/ioc", "/exposure", "/actors", "/scan-me", "/kripto", "/haqqinda"].map(
      (p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: 0.8 })
    ),
  ];

  const storyUrls: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `${base}/xeber/${s.slug}`,
    lastModified: new Date(s.publishedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const actorUrls: MetadataRoute.Sitemap = actorIds.map((id) => ({
    url: `${base}/actors/${id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticUrls, ...storyUrls, ...actorUrls];
}
