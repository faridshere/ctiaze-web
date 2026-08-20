import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getLatestSnapshot } from "@/lib/exposure";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "ctiaze — Azərbaycanın internet attack-surface-i";

// Branded share card for the /exposure page (Azerbaijan's weekly Shodan attack
// surface). Honest by construction: if there's no snapshot, render nothing
// numeric — never invent a host count.
export default async function Image() {
  const snap = await getLatestSnapshot().catch(() => null);
  const tagline =
    snap && typeof snap.total_hosts === "number"
      ? `${snap.total_hosts.toLocaleString("en-US")} host internetə açıq`
      : "Azərbaycanın həftəlik attack-surface mənzərəsi";
  return ogCard("Azərbaycanın internet exposure-u", tagline, {
    category: "attack surface",
    verified: true,
  });
}
