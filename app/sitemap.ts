import type { MetadataRoute } from "next";
import { getStories } from "@/lib/stories";
import { getSitemapActors } from "@/lib/threatactors";
import { SITE_URL, storyUrl } from "@/lib/site";

export const revalidate = 21600;

// The public surface is the landing page plus the story pages the Telegram
// channel links to. Everything else was shelved under app/_disabled and now
// 404s, so it must not be advertised here — a sitemap full of 404s is worse
// than a small one: it wastes crawl budget and teaches crawlers to distrust it.
// Re-add a section here and in app/robots.ts together when a tool comes back.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Every published story (2026-10-10: this listed the newest 500 of ~1,075,
  // so half the archive was invisible to search). The cap only guards against
  // runaway growth; one sitemap file holds 50,000 URLs.
  const [stories, actors] = await Promise.all([
    getStories(20000).catch(() => []),
    getSitemapActors(5000).catch(() => []),
  ]);
  const newest = stories[0] ? new Date(stories[0].publishedAt) : new Date();

  // A CVE hub changes when a dispatch names it: its lastmod is the newest such
  // dispatch, not one date stamped on every row. Stories are newest first, so
  // the first sighting of an id is its newest.
  const cveLastmod = new Map<string, Date>();
  for (const s of stories) {
    for (const c of s.cveIds) {
      const id = c.toUpperCase();
      if (!cveLastmod.has(id)) cveLastmod.set(id, new Date(s.publishedAt));
    }
  }

  return [
    { url: SITE_URL, lastModified: newest, changeFrequency: "daily", priority: 1 },
    // These were missing entirely: the sitemap carried 434 story URLs and nothing
    // else, so /about, /actors and every actor dossier were invisible to search.
    { url: `${SITE_URL}/about`, lastModified: newest, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: newest, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/news`, lastModified: newest, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${SITE_URL}/actors`, lastModified: newest, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE_URL}/api-docs`, lastModified: newest, changeFrequency: "monthly" as const, priority: 0.5 },
    // One hub per CVE the wire has named recently — the pages analysts search for.
    ...[...cveLastmod.entries()].slice(0, 400).map(([cve, at]) => ({
      url: `${SITE_URL}/cve/${cve}`,
      lastModified: at,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    // Thin dossiers (no techniques, never on the wire) are noindex and left out.
    ...actors.map((a) => ({
      url: `${SITE_URL}/actors/${a.id}`,
      ...(a.lastModified ? { lastModified: a.lastModified } : {}),
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
