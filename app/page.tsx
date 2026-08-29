import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import { TheWire } from "@/components/TheWire";
import { HomeIntel } from "@/components/HomeIntel";
import { getStories, getStats } from "@/lib/stories";
import { getDoStats } from "@/lib/dostats";
import { getLatestSnapshot } from "@/lib/exposure";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n-server";
import { jsonLdSafe } from "@/lib/format";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 180;

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/", dil, en,
    azTitle: "skopnix — qlobal kiber-təhlükə kəşfiyyatı API-si",
    enTitle: "skopnix — global cyber-threat intelligence, off the wire",
    azDesc: "Qlobal kibertəhlükə kəşfiyyatı — API və MCP server kimi. Mənbəyə qarşı yoxlanılır, hər 2 saatdan bir yenilənir, regionlarda sensor dərinliyi ilə.",
    enDesc: "Global cyber-threat intelligence as an API and MCP server — grounded, cited, refreshed every couple of hours, with sensor depth in the regions the big feeds skip.",
  });
}

export default async function HomePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const [stories, stats, snapshot, doStats] = await Promise.all([
    getStories(60),
    getStats(),
    getLatestSnapshot().catch(() => null),
    getDoStats(),
  ]);
  const regionCount = stories.filter((s) => s.region).length;

  const orgLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": "https://ctiaze.tech/#org", name: "skopnix",
        url: "https://ctiaze.tech",
        description: en
          ? "Global cyber-threat intelligence as an API and MCP server, with a regional data edge — grounded, cited, bilingual."
          : "Qlobal kiber-təhlükə kəşfiyyatı — API və MCP server, regional data üstünlüyü ilə. Yoxlanılır, mənbəyə istinad edilir, ikidilli.",
        logo: "https://ctiaze.tech/icon.svg",
        sameAs: ["https://t.me/ctiaze"],
      },
      {
        "@type": "WebSite", "@id": "https://ctiaze.tech/#site", name: "skopnix",
        url: "https://ctiaze.tech", inLanguage: ["az", "en"],
        publisher: { "@id": "https://ctiaze.tech/#org" },
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(orgLd) }} />
      <Header />
      <Hero archive={stats.total} kevCount={stats.kevCount} regionCount={regionCount} en={en} />
      <main id="main" className="flex-1">
        <TheWire stories={stories} en={en} />
        <HomeIntel en={en} snapshot={snapshot} doStats={doStats} />
      </main>
      <Footer />
    </div>
  );
}
