import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "ctiaze — Azərbaycan kiber-təhlükə kəşfiyyatı";

export default async function Image() {
  return ogCard(
    "Azərbaycan kiber-təhlükə kəşfiyyatı",
    "AI ilə seçilir, yoxlanılır və Azərbaycan dilinə tərcümə olunur — 24/7",
    { verified: false }
  );
}
