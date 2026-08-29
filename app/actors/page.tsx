import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ActorSearch } from "@/components/ActorSearch";
import { ActorDossier } from "@/components/ActorDossier";
import Link from "next/link";
import { getActorsPageData } from "@/lib/threatactors";
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

// Subpage aurora: two quiet streaks, not the full hero storm — same world.
const STREAKS: React.CSSProperties[] = [
  { width: 1500, height: 260, left: -240, top: -60, background: "linear-gradient(100deg, transparent 6%, rgba(38,90,150,0.4) 32%, rgba(111,211,230,0.34) 55%, transparent 92%)" },
  { width: 1100, height: 150, right: -180, top: 120, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.10) 45%, rgba(111,211,230,0.16) 68%, transparent)" },
];

function SectionHead({ title, note, brand }: { title: string; note?: string; brand?: boolean }) {
  return (
    <div data-sc className="mt-16 flex items-baseline gap-3">
      <h2 className={`font-display text-[1.35rem] font-semibold tracking-[-0.015em] ${brand ? "text-brand" : "text-ink-primary"}`}>{title}</h2>
      <span className="h-px flex-1 bg-hairline" />
      {note && <span className="font-mono text-[11px] text-ink-muted">{note}</span>}
    </div>
  );
}

export default async function ActorsPage() {
  const locale = await getLocale();
  const t = getDict(locale).actors;
  const { regional, top, stats, index } = await getActorsPageData();
  const en = locale === "en";

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      {/* APT section header — the core register: aurora, centered display type */}
      <section className="relative isolate overflow-hidden border-b border-hairline bg-[#05060a]">
        {STREAKS.map((st, i) => (
          <div key={i} aria-hidden className="aurora-streak pointer-events-none absolute rounded-full" style={{ ...st, filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: `${i * -5}s` }} />
        ))}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-12 pt-16 text-center sm:pb-16 sm:pt-24">
          <p data-sc className="font-mono text-xs uppercase tracking-[0.28em] text-[#9AA6B4]">{t.eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-balance font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink-primary">{t.h1}</h1>
          <p data-sc className="mx-auto mt-5 max-w-2xl leading-relaxed text-ink-secondary">
            {t.leadPre}
            <span className="text-ink-primary">{t.leadMid}</span>
            {t.leadEnd}
          </p>
          <div data-sc="2" className="mx-auto mt-8 max-w-3xl text-left">
            <ActorSearch locale={locale} />
          </div>
          <p data-sc="3" className="mt-6 font-mono text-[length:var(--t-micro)] text-[#8A94A2]">
            <b className="font-normal tabular-nums text-ink-primary">{stats.total.toLocaleString("en-US")}</b> {en ? "dossiers" : "dosye"} ·{" "}
            <b className="font-normal tabular-nums text-ink-primary">{stats.active}</b> {en ? "active" : "aktiv"} ·{" "}
            MISP Galaxy + ransomware.live + MITRE ATT&amp;CK
          </p>
        </div>
      </section>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-14">
        {regional.length > 0 && (
          <>
            <SectionHead title={t.regionalTitle} note={t.regionalNote} brand />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regional.map((a, i) => (
                <div key={a._id} data-sc style={{ transitionDelay: `${Math.min(i * 60, 240)}ms` }}>
                  <ActorDossier a={a} locale={locale} />
                </div>
              ))}
            </div>
          </>
        )}

        <SectionHead title={t.leadingTitle} note={t.leadingNote} />
        {top.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((a, i) => (
              <div key={a._id} data-sc style={{ transitionDelay: `${Math.min((i % 6) * 60, 240)}ms` }}>
                <ActorDossier a={a} locale={locale} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">{t.rosterEmpty}</p>
        )}

        {/* Crawlable A–Z index: real internal links for the full dossier set. */}
        {index.length > 0 && (
          <section>
            <SectionHead title={en ? "All threat actors" : "Bütün təhdid aktorları"} note={String(index.length)} />
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {index.map((a) => (
                <li key={a.id} className="min-w-0">
                  <Link
                    href={`/actors/${a.id}`}
                    className="block truncate py-0.5 text-sm text-ink-secondary transition-colors hover:text-brand"
                    title={a.name}
                  >
                    <span className={a.type === "nation-state" ? "text-accent-critical/70" : "text-ink-muted"} aria-hidden="true">▸ </span>
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
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
