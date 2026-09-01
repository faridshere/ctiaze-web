import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import { TheWire } from "@/components/TheWire";
import { Waitlist } from "@/components/Waitlist";
import { unstable_cache } from "next/cache";
import { getStories, getStats } from "@/lib/stories";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n-server";
import { jsonLdSafe } from "@/lib/format";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 180;

// All Mongo work rides Vercel's shared data cache: one blob, warm for every
// lambda — a cold instance renders from cache instantly.
const getHomeData = unstable_cache(
  async () => {
    const [stories, stats] = await Promise.all([getStories(24), getStats()]);
    // Titles + flags only — never ship 24 full article bodies in the RSC payload.
    const wire = stories.map((s) => ({
      id: s.id, slug: s.slug, titleEn: s.titleEn, titleAz: s.titleAz,
      kev: s.kev, severity: s.severity, cveIds: s.cveIds.slice(0, 1), publishedAt: s.publishedAt,
    }));
    return { wire, stats };
  },
  ["home-data-v4"],
  { revalidate: 300 },
);

// Honest sync label from the newest published story at render time.
function syncLabel(newestIso: string | undefined, en: boolean): string {
  if (!newestIso) return en ? "syncing" : "sinxronlaşır";
  const m = Math.max(1, Math.round((Date.now() - new Date(newestIso).getTime()) / 60_000));
  const r = m < 60 ? `${m}${en ? "m" : "d"}` : m < 1440 ? `${Math.round(m / 60)}${en ? "h" : "s"}` : `${Math.round(m / 1440)}${en ? "d" : "g"}`;
  return en ? `synced ${r} ago` : `sinxron ${r} əvvəl`;
}

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/", en,
    azTitle: "skopnix — global cyber-threat intelligence, off the wire",
    enTitle: "skopnix — global cyber-threat intelligence, off the wire",
    azDesc: "The world's cyber threats, read straight off the wire — grounded, refreshed around the clock, nothing invented.",
    enDesc: "The world's cyber threats, read straight off the wire — grounded, refreshed around the clock, nothing invented.",
  });
}

export default async function HomePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const { wire, stats } = await getHomeData();
  const syncedLabel = syncLabel(wire[0]?.publishedAt, en);

  const orgLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": "https://skopnix.com/#org", name: "skopnix",
        url: "https://skopnix.com",
        description: "The world's cyber threats, read straight off the wire — grounded, continuous, nothing invented.",
        logo: "https://skopnix.com/icon.svg",
      },
      {
        "@type": "WebSite", "@id": "https://skopnix.com/#site", name: "skopnix",
        url: "https://skopnix.com", inLanguage: ["en"],
        publisher: { "@id": "https://skopnix.com/#org" },
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(orgLd) }} />
      <Header />
      <Hero archive={stats.total} kevCount={stats.kevCount} syncedLabel={syncedLabel} />
      <main id="main" className="flex-1">
        <TheWire stories={wire} en={en} />
        <section className="border-t border-hairline bg-[#070809] px-[var(--sp-gutter)] py-[clamp(48px,7vw,88px)]">
          <Waitlist source="home" />
        </section>
      </main>
      <Footer />
    </div>
  );
}
