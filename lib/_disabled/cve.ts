import { getStories } from "../stories";

// Aggregates every CVE that appears anywhere in the published archive, mapped to
// the story/stories that mention it. This is the honest "coverage graph": a CVE
// links to the briefings that discuss it (usually one, sometimes more). Per-CVE
// authority info (KEV / EPSS / CVSS / description) is layered on top at render
// time via the keyless lib/cveintel helpers — no data is invented here.

export type CveRef = {
  cve: string;
  kev: boolean; // any linked story is KEV-flagged
  stories: { slug: string; titleAz: string; titleEn: string; publishedAt: string; category: string }[];
  latest: string; // most-recent linked publishedAt (ISO) — for sorting
};

export async function getCveIndex(limit = 400): Promise<CveRef[]> {
  const stories = await getStories(limit);
  const map = new Map<string, CveRef>();
  for (const s of stories) {
    for (const raw of s.cveIds) {
      const cve = raw.toUpperCase();
      const cur =
        map.get(cve) ?? { cve, kev: false, stories: [], latest: s.publishedAt };
      if (!cur.stories.some((x) => x.slug === s.slug)) {
        cur.stories.push({
          slug: s.slug,
          titleAz: s.titleAz,
          titleEn: s.titleEn,
          publishedAt: s.publishedAt,
          category: s.category,
        });
      }
      if (s.kev) cur.kev = true;
      if (s.publishedAt > cur.latest) cur.latest = s.publishedAt;
      map.set(cve, cur);
    }
  }
  // KEV first, then most-recent — the ordering an analyst triages in.
  return [...map.values()].sort(
    (a, b) => Number(b.kev) - Number(a.kev) || b.latest.localeCompare(a.latest)
  );
}
