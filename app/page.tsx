import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LiveUpdateBanner } from "@/components/LiveUpdateBanner";
import { SpektrLedger } from "@/components/SpektrLedger";
import { DiqqetRail } from "@/components/DiqqetRail";
import { WatchDesk } from "@/components/WatchDesk";
import { SinceLastVisit } from "@/components/SinceLastVisit";
import { getStories, getStats } from "@/lib/stories";
import { getDoStats } from "@/lib/dostats";
import { getLatestSnapshot } from "@/lib/exposure";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n";
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
    azTitle: "ctiaze — Azərbaycan kiber-təhlükə kəşfiyyatı",
    enTitle: "ctiaze — automated Azerbaijani cyber-threat intelligence",
    azDesc: "Qlobal kiber-təhlükə xəbərləri Azərbaycan dilində — AI ilə seçilir, mənbəyə qarşı yoxlanılır, hər 2 saatdan bir avtomatik yenilənir. Yanlış pozitiv yoxdur.",
    enDesc: "Global cyber-threat news in Azerbaijani — AI-curated, fact-checked against source, refreshed automatically every 2 hours. No false positives.",
  });
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDict(locale).feed;
  const [stories, stats, snapshot, doStats] = await Promise.all([
    getStories(60),
    getStats(),
    getLatestSnapshot().catch(() => null),
    getDoStats(),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(orgLd) }} />
      <Header />
      <LiveUpdateBanner initialCount={stats.total} />
      <WatchDesk en={en} archive={stats.total} stats={doStats} />
      <main id="main" className="mx-auto w-full max-w-[75rem] flex-1 px-[var(--sp-gutter)] pb-[var(--sp-section)]">
        <SinceLastVisit currentCount={stats.total} en={en} />
        {stories.length === 0 ? (
          <p className="py-24 text-center font-mono text-[length:var(--t-meta)] text-ink-muted">
            {t.emptyFeed}
          </p>
        ) : (
          <SpektrLedger
            stories={stories}
            rail={
              <DiqqetRail
                stories={stories}
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
