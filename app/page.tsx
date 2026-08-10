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

  return (
    <div className="flex min-h-screen flex-col">
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
