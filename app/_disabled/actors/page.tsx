import type { Metadata } from "next";
import { Header } from "@/components/_disabled/Header";
import { Footer } from "@/components/_disabled/Footer";
import { ActorSearch } from "@/components/_disabled/ActorSearch";
import { Waitlist } from "@/components/Waitlist";
import { WaitlistModal } from "@/components/_disabled/WaitlistModal";
import { ActorRow } from "@/components/_disabled/ActorRow";
import Link from "next/link";
import { getActorsPageData } from "@/lib/_disabled/threatactors";
import { getDict } from "@/lib/_disabled/i18n";
import { getLocale } from "@/lib/_disabled/i18n-server";

export const revalidate = 10800;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Threat actors — APT & crime groups",
  alternates: { canonical: "https://skopnix.com/actors" },
  description:
    "Who's targeting you? Search by country, sector, or company for the APT and crime groups that target it. We show only what's openly stated.",
};

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
  const { top, stats, index } = await getActorsPageData();
  const en = locale === "en";

  // Group the full roster by first letter so a few hundred names read as an
  // A–Z index a visitor can jump through, not a wall of tiny text.
  const indexGroups = new Map<string, typeof index>();
  for (const a of index) {
    const ch = a.name[0]?.toUpperCase() ?? "#";
    const key = /[A-Z]/.test(ch) ? ch : "#";
    if (!indexGroups.has(key)) indexGroups.set(key, []);
    indexGroups.get(key)!.push(a);
  }
  const indexLetters = [...indexGroups.keys()].sort((a, b) => a.localeCompare(b, "en"));

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <WaitlistModal source="actors" />
      {/* APT section header — the core register: aurora, centered display type */}
      <section className="relative isolate overflow-hidden border-b border-hairline bg-[#05060a]">
        {STREAKS.map((st, i) => (
          <div key={i} aria-hidden className="aurora-streak pointer-events-none absolute rounded-full" style={{ ...st, filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: `${i * -5}s` }} />
        ))}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-12 pt-16 text-center sm:pb-16 sm:pt-24">
          <h1 data-sc className="mx-auto max-w-3xl text-balance font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink-primary">{t.h1}</h1>
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
            <b className="font-normal tabular-nums text-ink-primary">{stats.active}</b> {en ? "active" : "aktiv"}
          </p>
        </div>
      </section>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-14">
        {/* International scope leads; a ledger, not a card wall — the wire's
            language. Full dossiers live one click in at /actors/[id]. */}
        <SectionHead title={t.leadingTitle} note={t.leadingNote} />
        {top.length > 0 ? (
          <div className="mt-2">
            {top.map((a, i) => (
              <ActorRow key={a._id} a={a} locale={locale} i={i} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">{t.rosterEmpty}</p>
        )}


        {/* Crawlable A–Z index: real internal links for the full dossier set,
            grouped and jump-navigable so a few hundred names stay scannable. */}
        {index.length > 0 && (
          <section>
            <SectionHead title={en ? "All threat actors" : "Bütün təhdid aktorları"} note={String(index.length)} />
            <nav
              aria-label={en ? "Jump to letter" : "Hərfə keç"}
              className="sticky top-12 z-10 -mx-4 mt-4 overflow-x-auto border-y border-hairline bg-surface px-4 py-2"
            >
              <ul className="flex gap-1 font-mono text-[11px]">
                {indexLetters.map((L) => (
                  <li key={L}>
                    <a
                      href={`#actor-${L === "#" ? "num" : L}`}
                      className="block rounded-sm px-2 py-1 uppercase text-ink-muted transition-colors hover:bg-brand-wash hover:text-brand"
                    >
                      {L}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {indexLetters.map((L) => (
              <section key={L} id={`actor-${L === "#" ? "num" : L}`} className="scroll-mt-24">
                <h3 className="mt-6 flex items-baseline gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-secondary">
                  <span className="text-ink-primary">{L}</span>
                  <span aria-hidden className="h-px flex-1 bg-hairline" />
                  <span className="font-normal normal-case tracking-normal text-ink-muted">{indexGroups.get(L)!.length}</span>
                </h3>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
                  {indexGroups.get(L)!.map((a) => (
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
            ))}
          </section>
        )}

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          {stats.total.toLocaleString("en-US")} dossiers · {stats.active} active. Search covers the whole roster; nothing is invented.
        </p>
        <div className="mt-16 border-t border-hairline pt-12">
          <Waitlist source="actors:inline" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
