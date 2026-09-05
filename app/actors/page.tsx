import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { Kicker } from "@/components/site/Kicker";
import { CtaBand } from "@/components/site/CtaBand";
import { ActorSearch } from "@/components/actors/ActorSearch";
import { OnTheWire } from "@/components/actors/OnTheWire";
import { ActorLedgerRow } from "@/components/actors/ActorLedgerRow";
import { OriginStrip } from "@/components/actors/OriginStrip";
import { getActorsPageData } from "@/lib/threatactors";
import { absoluteUrl } from "@/lib/site";

// The Adversaries index — one hourly-cached blob (lib/threatactors.ts) drives
// every section below: the search roster, the wire's own recent mentions, the
// best-documented actors, the assessed-origin breakdown and the full A–Z. No
// per-request Mongo read; no searchParams read here (that would force this
// page dynamic) — the origin filter lives entirely client-side in ActorSearch.
export const revalidate = 3600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Adversaries — threat actors",
  description:
    "APT and crime-crew dossiers built from MISP, MITRE ATT&CK and ransomware leak sites — assessed origin, observed targets and techniques, exactly as the sources state them.",
  alternates: { canonical: absoluteUrl("/actors") },
};

export default async function ActorsPage() {
  const data = await getActorsPageData();

  // A few hundred names read as an A–Z a visitor can jump through, not a wall
  // of tiny text: group by first letter, "#" catches anything non-alphabetic.
  const groups = new Map<string, typeof data.index>();
  for (const a of data.index) {
    const ch = a.name[0]?.toUpperCase() ?? "#";
    const key = /[A-Z]/.test(ch) ? ch : "#";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const letters = [...groups.keys()].sort((a, b) => a.localeCompare(b, "en"));

  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHead
          kicker={`${data.stats.total.toLocaleString("en-US")} dossiers · ${data.stats.onWire90d.toLocaleString("en-US")} on the wire`}
          live
          title="Adversaries."
          meta={
            <>
              {data.stats.nationState.toLocaleString("en-US")} state-sponsored
              {" · "}
              {data.stats.crime.toLocaleString("en-US")} crime crews
              {" · "}
              {data.stats.withTtps.toLocaleString("en-US")} with ATT&amp;CK data
              {data.stats.lastRefreshed && (
                <>
                  {" · "}roster refreshed {data.stats.lastRefreshed.slice(0, 10)}
                </>
              )}
            </>
          }
        />

        <section className="mx-auto mt-10 w-full max-w-[80rem] px-[var(--sp-gutter)]">
          <ActorSearch origins={data.origins} />
        </section>

        {data.onTheWire.length > 0 && (
          <section className="mx-auto mt-14 w-full max-w-[80rem] px-[var(--sp-gutter)]">
            <OnTheWire rows={data.onTheWire} />
          </section>
        )}

        <section className="mx-auto mt-16 w-full max-w-[80rem] px-[var(--sp-gutter)]">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Kicker>Leading adversaries</Kicker>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              ranked by documentation depth, not by fear
            </p>
          </div>
          {data.leading.length > 0 ? (
            <div className="mt-4">
              {data.leading.map((a, i) => (
                <ActorLedgerRow key={a.id} a={a} i={i} />
              ))}
            </div>
          ) : (
            <p className="mt-6 font-mono text-[12px] text-ink-muted">no dossiers meet the bar yet.</p>
          )}
        </section>

        <div className="mx-auto w-full max-w-[80rem] px-[var(--sp-gutter)]">
          <OriginStrip origins={data.origins} />
        </div>

        {data.index.length > 0 && (
          <section className="mx-auto mt-16 w-full max-w-[80rem] px-[var(--sp-gutter)]">
            <div className="flex items-baseline justify-between gap-3">
              <Kicker>All adversaries</Kicker>
              <span className="font-mono text-[11px] text-ink-muted">{data.index.length.toLocaleString("en-US")}</span>
            </div>
            <nav
              aria-label="Jump to letter"
              className="sticky top-14 z-10 mt-4 overflow-x-auto border-y border-hairline bg-surface py-2"
            >
              <ul className="flex gap-1 font-mono text-[11px]">
                {letters.map((L) => (
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
            {/* Each letter is a closed <details>: 1,300+ names stay crawlable in the
                DOM without a 17,000px page, and the roster links are plain anchors —
                a <Link> per dossier would prefetch hundreds of on-demand ISR renders
                as a visitor scrolls, which is exactly the cost the free tier can't take. */}
            {letters.map((L) => (
              <details key={L} id={`actor-${L === "#" ? "num" : L}`} className="group scroll-mt-24 border-b border-hairline">
                <summary className="flex cursor-pointer list-none items-baseline gap-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-ink-primary [&::-webkit-details-marker]:hidden">
                  <span className="text-ink-primary">{L}</span>
                  <span aria-hidden className="h-px flex-1 bg-hairline" />
                  <span className="font-normal normal-case tracking-normal text-ink-muted">{groups.get(L)!.length}</span>
                  <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-90">→</span>
                </summary>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-5 sm:grid-cols-3 lg:grid-cols-4">
                  {groups.get(L)!.map((a) => (
                    <li key={a.id} className="min-w-0">
                      <a
                        href={`/actors/${a.id}`}
                        className="block truncate py-0.5 text-sm text-ink-secondary transition-colors hover:text-brand"
                        title={a.name}
                      >
                        {a.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        )}

        <div className="mt-[var(--sp-section)]">
          <CtaBand source="actors" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
