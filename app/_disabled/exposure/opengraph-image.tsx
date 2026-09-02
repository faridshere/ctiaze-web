import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getLatestSnapshot } from "@/lib/exposure";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "skopnix — Azerbaijan's internet attack surface";

// Branded share card for the /exposure page (Azerbaijan's weekly Shodan attack
// surface). Honest by construction: if there's no snapshot, render nothing
// numeric — never invent a host count.
export default async function Image() {
  const snap = await getLatestSnapshot().catch(() => null);
  const tagline =
    snap && typeof snap.total_hosts === "number"
      ? `${snap.total_hosts.toLocaleString("en-US")} hosts exposed to the internet`
      : "Azerbaijan's weekly attack surface";
  return ogCard("Azerbaijan's internet exposure", tagline, {
    category: "attack surface",
    verified: true,
  });
}
