import type { MetadataRoute } from "next";
import { getStories } from "@/lib/stories";
import { getActorIds } from "@/lib/threatactors";
import { getAllCveIds } from "@/lib/cveintel-page";
import { getGuideSlugs } from "@/lib/guides";
import { getSectorSlugs } from "@/lib/sectors";
import { GLOSSARY } from "@/lib/glossary";

export const revalidate = 3600;

// Makes the /xeber/[slug] stories AND the /actors/[slug] dossiers discoverable to
// search + AI answer engines — the per-CVE Azerbaijani long-tail and the only
// Azerbaijani threat-actor dossier set in existence, where ctiaze can rank #1.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://ctiaze.tech";
  const [stories, actorIds, cveIds, guideSlugs, sectorSlugs] = await Promise.all([
    getStories(500).catch(() => []),
    getActorIds(800).catch(() => []),
    getAllCveIds().catch(() => []),
    getGuideSlugs().catch(() => []),
    getSectorSlugs().catch(() => []),
  ]);
  const newest = stories[0] ? new Date(stories[0].publishedAt) : new Date();

  // Static pages: only the homepage carries a real lastModified (the newest story).
  // Stamping new Date() on every URL every run teaches Google to ignore our lastmod.
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}`, lastModified: newest, changeFrequency: "hourly", priority: 1 },
    ...["/cve", "/ioc", "/exposure", "/actors", "/sektor", "/veziyyet", "/hucum", "/scan-me", "/kripto", "/lugat", "/haqqinda"].map(
      (p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: 0.8 })
    ),
  ];

  const guideUrls: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: `${base}/hucum/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const sectorUrls: MetadataRoute.Sitemap = sectorSlugs.map((slug) => ({
    url: `${base}/sektor/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const glossaryUrls: MetadataRoute.Sitemap = GLOSSARY.map((g) => ({
    url: `${base}/lugat/${g.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

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

  // Every /cve/[id] explainer (~7.9k — comfortably under the 50k-URL sitemap
  // cap). No lastModified: the docs carry no date, and a fake one teaches
  // Google to ignore our lastmod (see the note above).
  const cveUrls: MetadataRoute.Sitemap = cveIds.map((id) => ({
    url: `${base}/cve/${id}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticUrls, ...sectorUrls, ...guideUrls, ...glossaryUrls, ...storyUrls, ...actorUrls, ...cveUrls];
}
