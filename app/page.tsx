import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import { TheWire } from "@/components/TheWire";
import { HomeIntel } from "@/components/HomeIntel";
import { unstable_cache } from "next/cache";
import { getStories, getStats } from "@/lib/stories";
import { getTopActors } from "@/lib/threatactors";
import { getDoStats } from "@/lib/dostats";
import { getLatestSnapshot } from "@/lib/exposure";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n-server";
import { jsonLdSafe } from "@/lib/format";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 180;

// The locale cookie makes this page dynamic, so route-level ISR never applies.
// All Mongo work therefore rides Vercel's shared data cache: one blob, five
// minutes, warm for every lambda — a cold instance renders from cache instantly.
const getHomeData = unstable_cache(
  async () => {
    const [stories, stats, snapshot, doStats, topActors] = await Promise.all([
      getStories(24),
      getStats(),
      getLatestSnapshot().catch(() => null),
      getDoStats(),
      getTopActors(4).catch(() => []),
    ]);
    const adversaries = topActors.map((a) => ({
      id: a._id, name: a.name, type: a.type,
      tech: a.techniques?.length ?? 0,
      origin: a.origin_country ?? null,
      victims: a.victim_count ?? 0,
    }));
    // The wire renders titles + flags only — never ship 24 full article bodies
    // in the RSC payload (they were the multi-second transfer weight on "/").
    const wire = stories.map((s) => ({
      id: s.id, slug: s.slug, titleEn: s.titleEn, titleAz: s.titleAz,
      sourceUrl: s.sourceUrl, kev: s.kev, region: s.region,
      severity: s.severity, cveIds: s.cveIds.slice(0, 1), publishedAt: s.publishedAt,
    }));
    return { wire, stats, snapshot, doStats, adversaries };
  },
  ["home-data-v3"],
  { revalidate: 300 },
);

// Honest sync label: derived from the newest published story at render time,
// never hardcoded. Helper lives outside the component for react-hooks/purity.
function syncLabel(newestIso: string | undefined, en: boolean): string {
  if (!newestIso) return en ? "syncing" : "sinxronlaşır";
  const m = Math.max(1, Math.round((Date.now() - new Date(newestIso).getTime()) / 60_000));
  const r = m < 60 ? `${m}${en ? "m" : "d"}` : m < 1440 ? `${Math.round(m / 60)}${en ? "h" : "s"}` : `${Math.round(m / 1440)}${en ? "d" : "g"}`;
  return en ? `synced ${r} ago` : `sinxron ${r} əvvəl`;
}

export async function generateMetadata(
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/", en,
    azTitle: "skopnix — qlobal kiber-təhlükə kəşfiyyatı API-si",
    enTitle: "skopnix — global cyber-threat intelligence, off the wire",
    azDesc: "Qlobal kibertəhlükə kəşfiyyatı — API və MCP server kimi. Mənbəyə qarşı yoxlanılır, hər 2 saatdan bir yenilənir, regionlarda sensor dərinliyi ilə.",
    enDesc: "Global cyber-threat intelligence as an API and MCP server — grounded, cited, refreshed every couple of hours, with sensor depth in the regions the big feeds skip.",
  });
}

export default async function HomePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const { wire, stats, snapshot, doStats, adversaries } = await getHomeData();
  const regionCount = wire.filter((s) => s.region).length;
  const syncedLabel = syncLabel(wire[0]?.publishedAt, en);

  const orgLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": "https://skopnix.com/#org", name: "skopnix",
        url: "https://skopnix.com",
        description: en
          ? "Global cyber-threat intelligence as an API and MCP server, with a regional data edge — grounded, cited, bilingual."
          : "Qlobal kiber-təhlükə kəşfiyyatı — API və MCP server, regional data üstünlüyü ilə. Yoxlanılır, mənbəyə istinad edilir, ikidilli.",
        logo: "https://skopnix.com/icon.svg",
        sameAs: ["https://t.me/ctiaze"],
      },
      {
        "@type": "WebSite", "@id": "https://skopnix.com/#site", name: "skopnix",
        url: "https://skopnix.com", inLanguage: ["az", "en"],
        publisher: { "@id": "https://skopnix.com/#org" },
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(orgLd) }} />
      <Header />
      <Hero archive={stats.total} kevCount={stats.kevCount} regionCount={regionCount} syncedLabel={syncedLabel} />
      <main id="main" className="flex-1">
        <TheWire stories={wire} en={en} />
        <HomeIntel en={en} snapshot={snapshot} doStats={doStats} adversaries={adversaries} />
      </main>
      <Footer />
    </div>
  );
}
