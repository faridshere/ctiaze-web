import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getStoryBySlug } from "@/lib/stories";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "ctiaze";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) {
    return ogCard("ctiaze", "Azərbaycan kiber-təhlükə kəşfiyyatı", {});
  }
  return ogCard(story.titleAz, "Azərbaycan kiber-təhlükə kəşfiyyatı", {
    category: story.category,
    cve: story.cveIds[0],
    kev: story.kev,
    critical: story.severity === "critical",
    verified: true,
  });
}
