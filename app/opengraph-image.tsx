import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "skopnix — global cyber-threat intelligence";

export default async function Image() {
  return ogCard(
    "The world's threats, off the wire",
    "Global CTI as an API + MCP server — AI-scored, verified, sensor-backed. 24/7.",
    { verified: false }
  );
}
