import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LiveUpdateBanner } from "@/components/LiveUpdateBanner";
import { SpektrLedger } from "@/components/SpektrLedger";
import { DiqqetRail } from "@/components/DiqqetRail";
import { getStories, getStats } from "@/lib/stories";
import { getLatestSnapshot } from "@/lib/exposure";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const revalidate = 180;

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDict(locale).feed;
  const [stories, stats, snapshot] = await Promise.all([
    getStories(60),
    getStats(),
    getLatestSnapshot().catch(() => null),
  ]);
  const azHosts = snapshot?.total_hosts ?? 0;
  const kevStories = stories.filter((s) => s.kev).slice(0, 5);
  const azStories = stories.filter((s) => s.region).slice(0, 5);

  const en = locale === "en";
  // Organization + WebSite entity so search knowledge panels and AI answer engines
  // can resolve "ctiaze" as a named Azerbaijani CTI publisher (the GEO play the
  // llms.txt route already targets). No SearchAction — there's no on-site search
  // URL endpoint to honestly advertise (the palette is keyboard-only).
  const orgLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": "https://ctiaze.tech/#org", name: "ctiaze",
        url: "https://ctiaze.tech",
        description: en
          ? "Automated Azerbaijani cyber-threat-intelligence — AI-curated, grounded, bilingual, 24/7."
          : "Avtomatlaşdırılmış Azərbaycan kiber-təhlükə kəşfiyyatı — AI ilə seçilir, yoxlanılır, ikidilli, 24/7.",
        logo: "https://ctiaze.tech/icon.svg",
        sameAs: ["https://t.me/ctiaze"],
      },
      {
        "@type": "WebSite", "@id": "https://ctiaze.tech/#site", name: "ctiaze",
        url: "https://ctiaze.tech", inLanguage: ["az", "en"],
        publisher: { "@id": "https://ctiaze.tech/#org" },
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <Header />
      <LiveUpdateBanner initialCount={stats.total} />
      <main className="mx-auto w-full max-w-[75rem] flex-1 px-[var(--sp-gutter)] pb-[var(--sp-section)]">
        {stories.length === 0 ? (
          <p className="py-24 text-center font-mono text-[length:var(--t-meta)] text-ink-muted">
            {t.emptyFeed}
          </p>
        ) : (
          <SpektrLedger
            stories={stories}
            rail={
              <DiqqetRail
                kevStories={kevStories}
                azStories={azStories}
                azHosts={azHosts}
                archive={stats.total}
              />
            }
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
