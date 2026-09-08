import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "skopnix — global cyber-threat intelligence";

export default async function Image() {
  return ogCard(
    "The world's threats, off the wire",
    "The world's threat reporting — AI-scored, source-grounded, actor-linked. 24/7.",
    { verified: false }
  );
}
