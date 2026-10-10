import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getStoryBySlug } from "@/lib/stories";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "skopnix";

// Cached, not rendered per hit (2026-10-10): with no CDN in front any more,
// every share-preview fetch cost a ~1 s PNG render (7.8 s cold) on the 1 GB
// box. An empty generateStaticParams plus revalidate makes this ISR: the
// first hit renders, later hits are served from the cache for a day. An
// unknown slug's 404 stays in memory and expires after a minute
// (lib/isr-cache-handler.mjs), so made-up ids reach neither the disk nor a
// long cache.
export const revalidate = 86400;
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  // Same as the dossier card: an unknown slug is 404, not a free PNG render.
  if (!story) return new Response("Not found", { status: 404 });
  return ogCard(story.titleEn || story.titleAz, "Global cyber-threat intelligence", {
    category: story.category,
    cve: story.cveIds[0],
    kev: story.kev,
    critical: story.severity === "critical",
    verified: true,
  });
}
