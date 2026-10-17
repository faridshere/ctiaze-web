import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { CtaBand } from "@/components/site/CtaBand";
import { ActorSearch } from "@/components/actors/ActorSearch";
import { OnTheWire } from "@/components/actors/OnTheWire";
import { ActorLedger } from "@/components/actors/ActorLedgerRow";
import { OriginStrip } from "@/components/actors/OriginStrip";
import { RosterLetter } from "@/components/actors/RosterLetter";
import { getActorsPageData } from "@/lib/threatactors";
import { absoluteUrl } from "@/lib/site";

// The Adversaries index — one hourly-cached blob (lib/threatactors.ts) drives
// every section below: the search roster, the wire's own recent mentions, the
// best-documented actors, the assessed-origin breakdown and the full A–Z. No
// per-request Mongo read; no searchParams read here (that would force this
// page dynamic) — the origin filter lives entirely client-side in ActorSearch.
//
// Set as Section B of the paper: the page head, the index line (search), the
// adversaries named on the wire as ruled rows, the ledger of leading
// adversaries, the by-origin table, and the A–Z as index columns. Every
// section head is the same system: a 2px rule, the head in the slab, one
// label line to its right.
export const revalidate = 3600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Adversaries — threat actors",
  description:
    "APT and crime-crew dossiers built from MISP, MITRE ATT&CK and ransomware leak sites — assessed origin, observed targets and techniques, exactly as the sources state them.",
  alternates: { canonical: absoluteUrl("/actors") },
};

const n = (x: number) => x.toLocaleString("en-US");

// Height of the compact masthead strip (48px bar + 1px rule + 1px rule +
// 28px section line). The two sticky elements on this page (the ledger head
// and the A–Z letter nav) sit under it via --strip-h, declared once on <main>
// so a change to the strip is a one-line change here until the header
// exposes the variable itself.
const STRIP_H = "78px";

// A stat on the page head: the figure in mono, the words in the label voice
// (the front page's IndexStrip pattern), never a whole phrase set in mono.
function Stat({ value, children }: { value: number; children: React.ReactNode }) {
  return (
    <span className="label text-ink-3">
      <span className="num font-mono text-[12px] tracking-normal text-ink">{n(value)}</span> {children}
    </span>
  );
}

export default async function ActorsPage() {
  const data = await getActorsPageData();
  const s = data.stats;

  // A few hundred names read as an A–Z a visitor can jump through, not a wall
  // of tiny text: group by first letter, "#" catches anything non-alphabetic.
  // (Same rule as letterOf() in RosterLetter, which re-groups on the client.)
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
      <SiteHeader section="Section B · Adversaries" />
      <main id="main" style={{ ["--strip-h" as string]: STRIP_H } as React.CSSProperties}>
        <PageHead
          kicker={s.lastRefreshed ? `The index · roster refreshed ${s.lastRefreshed.slice(0, 10)}` : "The index"}
          title="Adversaries."
          meta={
            <>
              <Stat value={s.total}>dossiers</Stat>
              <Stat value={s.nationState}>state-sponsored</Stat>
              <Stat value={s.crime}>crime crews</Stat>
              <Stat value={s.withTtps}>with ATT&amp;CK data</Stat>
              <Stat value={s.onWire90d}>named on the wire in 90 days</Stat>
            </>
          }
        >
          <p className="mt-5 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
            Every field is what a source states: MISP galaxy, MITRE ATT&amp;CK, ransomware leak sites, APTnotes. Assessed origin,
            observed targets, techniques by tactic, with the report that says so. A field no source states is left blank.
          </p>
        </PageHead>

        <section className="sheet mt-8 sm:mt-10" aria-label="Search the roster">
          <ActorSearch origins={data.origins} />
        </section>

        {data.onTheWire.length > 0 && (
          <section className="sheet mt-[var(--sp-section)]">
            <OnTheWire rows={data.onTheWire} />
          </section>
        )}

        <section className="sheet mt-[var(--sp-section)]" aria-labelledby="leading-head">
          <div className="rule-2" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-5">
            <h2 id="leading-head" className="headline text-[clamp(1.6rem,3vw,2.4rem)] text-ink">
              Leading adversaries
            </h2>
            <p className="label text-ink-3">
              ranked by documentation depth, not by fear · <span className="num font-mono tracking-normal">{n(data.leading.length)}</span> listed
            </p>
          </div>
          {data.leading.length > 0 ? (
            <div className="mt-5">
              <ActorLedger rows={data.leading} />
            </div>
          ) : (
            <p className="label mt-6 text-ink-3">no dossiers meet the bar yet.</p>
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
            Techniques are the ATT&amp;CK techniques the sources attribute; victims are the leak-site victims the pipeline holds. A blank is a
            field no source states.
          </p>
        </section>

        <section className="sheet mt-[var(--sp-section)]">
          <OriginStrip origins={data.origins} />
        </section>

        {data.index.length > 0 && (
          <section className="sheet mt-[var(--sp-section)]" aria-labelledby="az-head">
            <div className="rule-2" />
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-5">
              <h2 id="az-head" className="headline text-[clamp(1.6rem,3vw,2.4rem)] text-ink">
                All adversaries, A to Z
              </h2>
              <p className="label text-ink-3">
                <span className="num font-mono tracking-normal">{n(data.index.length)}</span> dossiers · open a letter to read it
              </p>
            </div>
            <nav aria-label="Jump to letter" className="sticky top-[var(--strip-h)] z-10 mt-5 border-y border-ink bg-paper">
              <ul className="flex flex-wrap gap-x-1 py-1.5">
                {letters.map((L) => (
                  <li key={L}>
                    <a
                      href={`#actor-${L === "#" ? "num" : L}`}
                      className="label block px-1.5 py-1 text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline sm:px-2"
                    >
                      {L}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {/* Each letter is a closed <details> whose names load on first open
                (components/actors/RosterLetter.tsx): no 17,000px page, and the
                roster is no longer serialised twice into every /actors render. */}
            {letters.map((L) => (
              <RosterLetter key={L} letter={L} count={groups.get(L)!.length} />
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
