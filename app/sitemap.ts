import type { MetadataRoute } from "next";
import { getStories } from "@/lib/stories";

export const revalidate = 3600;

// Makes the hundreds of /xeber/[slug] URLs discoverable to search + AI answer
// engines — the per-CVE Azerbaijani long-tail where ctiaze can rank #1.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://ctiaze.tech";
  const stories = await getStories(500).catch(() => []);

  const staticUrls: MetadataRoute.Sitemap = ["", "/ioc", "/exposure", "/kripto", "/haqqinda"].map(
    (p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
      changeFrequency: p === "" ? "hourly" : "daily",
      priority: p === "" ? 1 : 0.8,
    })
  );

  const storyUrls: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `${base}/xeber/${s.slug}`,
    lastModified: new Date(s.publishedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticUrls, ...storyUrls];
}
