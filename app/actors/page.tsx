import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ActorSearch } from "@/components/ActorSearch";
import { ActorDossier } from "@/components/ActorDossier";
import { getTopActors, getRegionalActors, getActorStats } from "@/lib/threatactors";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Təhdid aktorları — APT və crime qrupları · Threat actors",
  description:
    "Who's targeting you? Search by country, sector, or company for the APT and crime groups that target it. Every answer is tied to a source (MISP Galaxy, ransomware.live, MITRE ATT&CK).",
};

function fmtDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "az-AZ", {
    timeZone: "Asia/Baku", day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

export default async function ActorsPage() {
  const locale = await getLocale();
  const t = getDict(locale).actors;
  const [regional, stats] = await Promise.all([getRegionalActors(6), getActorStats()]);
  // Leading grid excludes the regional actors shown above, so nothing repeats.
  const top = await getTopActors(24, new Set(regional.map((a) => a._id)));

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">{t.eyebrow}</p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl text-ink-primary sm:text-4xl">{t.h1}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {t.leadPre}
          <span className="text-ink-primary">{t.leadMid}</span>
          {t.leadEnd}
        </p>

        <div className="mt-8 max-w-3xl">
          <ActorSearch locale={locale} />
        </div>

        {regional.length > 0 && (
          <>
            <div className="mt-16 flex items-baseline gap-3">
              <h2 className="font-headline text-xl text-brand">{t.regionalTitle}</h2>
              <span className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[11px] text-ink-muted">{t.regionalNote}</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regional.map((a) => (
                <ActorDossier key={a._id} a={a} locale={locale} />
              ))}
            </div>
          </>
        )}

        <div className="mt-16 flex items-baseline gap-3">
          <h2 className="font-headline text-xl text-ink-primary">{t.leadingTitle}</h2>
          <span className="h-px flex-1 bg-hairline" />
          <span className="font-mono text-[11px] text-ink-muted">{t.leadingNote}</span>
        </div>

        {top.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((a) => (
              <ActorDossier key={a._id} a={a} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">{t.rosterEmpty}</p>
        )}

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          {t.sourcesLine(
            stats.total.toLocaleString("en-US"),
            stats.active,
            stats.translated,
            stats.lastRefreshed ? fmtDate(stats.lastRefreshed, locale) : ""
          )}
        </p>
      </main>
      <Footer />
    </div>
  );
}
