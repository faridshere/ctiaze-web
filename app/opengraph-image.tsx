import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "skopnix — global cyber-threat intelligence";

export default async function Image() {
  return ogCard(
    "The world's cyber threats, read straight off the wire.",
    "Every exploited CVE, the adversaries behind it, a weekly exposure census and a keyless JSON API. Refreshed around the clock.",
    { verified: false, section: "Global cyber-threat intelligence" }
  );
}
