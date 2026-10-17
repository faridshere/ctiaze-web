import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { LocalTime } from "@/components/site/LocalTime";
import { getAzBoardCached } from "@/lib/az";
import { epssPercent } from "@/lib/exploit-shape";
import {
  azCounts,
  NO_TARGET,
  REASON_TEXT,
  type Adversary,
  type AzBoard,
  type AzExploit,
  type Campaign,
  type ExposureListing,
  type Verdict,
} from "@/lib/az-shape";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

const INTRO =
  "The regional threat picture for Azerbaijan in one place: who is claiming attacks this week and whether the targets stayed up, the groups on record targeting the country, organisations named on breach listings, and the exploited vulnerabilities that matter here.";

export const metadata: Metadata = {
  title: "Azerbaijan threat dashboard — campaigns, adversaries, exposure",
  description: INTRO.slice(0, 160),
  alternates: { canonical: absoluteUrl("/az") },
};

async function load(): Promise<AzBoard | null> {
  try {
    return await getAzBoardCached();
  } catch (err) {
    console.error("[az] board unavailable:", err);
    return null;
  }
}

const KIND_LABEL: Record<string, string> = { telegram: "Telegram", bluesky: "Tracker", ransomware: "Leak site" };

const VERDICT_TONE: Record<Verdict, string> = {
  up: "text-better",
  filtered: "text-caution",
  unreachable: "text-worse",
  unchecked: "text-ink-3",
};

function utcDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmt(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US");
}

function SectionHead({ id, n, title, aside }: { id: string; n: string; title: string; aside?: React.ReactNode }) {
  return (
    <>
      <div className="rule-2" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2 pt-3">
        <h2 id={id} className="headline text-[clamp(1.5rem,3vw,2.2rem)] text-ink">
          <span className="num mr-3 font-mono text-[13px] font-normal text-ink-3">{n}</span>
          {title}
        </h2>
        {aside && <span className="label text-ink-3">{aside}</span>}
      </div>
    </>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rule py-6 text-[14px] text-ink-2">{children}</p>;
}

const UNAVAILABLE = "This source is unavailable right now. That is an error on our side, not a quiet week.";

function CampaignRow({ c }: { c: Campaign }) {
  return (
    <li className="row py-4" data-sev={c.verdict === "unreachable" ? "high" : undefined}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="label text-ink">{c.group}</span>
        <span className="tag text-ink-2">claim</span>
        {c.claimTypes.map((t) => (
          <span key={t} className="stamp stamp-ink">
            {t}
          </span>
        ))}
        <span className="text-[12px] text-ink-3">{c.kinds.map((k) => KIND_LABEL[k] ?? k).join(" · ")}</span>
      </div>
      <dl className="num mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[12px] text-ink-2">
        <dt className="text-ink-3">target</dt>
        <dd className="min-w-0 break-words">{c.target === NO_TARGET ? <span className="text-ink-3">{NO_TARGET}</span> : c.target}</dd>
        <dt className="text-ink-3">our check</dt>
        <dd>
          <span className={VERDICT_TONE[c.verdict]}>{c.verdict === "unchecked" ? "not checked" : c.verdict}</span>
        </dd>
        <dt className="text-ink-3">claims</dt>
        <dd>
          {c.claims} · {c.first === c.last ? utcDate(c.last) : `${utcDate(c.first)} → ${utcDate(c.last)}`}
        </dd>
      </dl>
      {c.sources.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-4">
          {c.sources.map((s, i) => (
            <a key={s} href={s} rel="nofollow noopener noreferrer" target="_blank" className="label ulink text-ink-3 hover:text-ink">
              Source{c.sources.length > 1 ? ` ${i + 1}` : ""} ↗
            </a>
          ))}
        </p>
      )}
    </li>
  );
}

function AdversaryCard({ a }: { a: Adversary }) {
  return (
    <li className="min-w-0 border-t border-rule-soft py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {a.dossier ? (
          <Link href={a.dossier} className="ulink font-display text-[18px] font-bold text-ink">
            {a.name}
          </Link>
        ) : (
          <span className="font-display text-[18px] font-bold text-ink">{a.name}</span>
        )}
        {a.credibility && <span className="tag text-ink-2">credibility · {a.credibility}</span>}
      </div>
      {a.aliases.length > 0 && <p className="mt-0.5 text-[12.5px] text-ink-3">also {a.aliases.join(", ")}</p>}
      <dl className="mt-2 space-y-1 text-[13.5px] leading-snug text-ink-2">
        {a.alignment && (
          <div>
            <dt className="label inline text-ink-3">Alignment · </dt>
            <dd className="inline">{a.alignment}</dd>
          </div>
        )}
        {a.hits.length > 0 && (
          <div>
            <dt className="label inline text-ink-3">Hits · </dt>
            <dd className="inline">{a.hits.join(", ")}</dd>
          </div>
        )}
        {a.claims !== null && (
          <div>
            <dt className="label inline text-ink-3">Claims on record · </dt>
            <dd className="num inline font-mono text-[12.5px]">{a.claims.toLocaleString("en-US")}</dd>
          </div>
        )}
      </dl>
      <blockquote className="mt-2 text-[13px] italic leading-snug text-ink-3">
        <span className="line-clamp-3">“{a.citation.quote}”</span>
        <a href={a.citation.url} target="_blank" rel="nofollow noopener noreferrer" className="label ulink mt-1 inline-block not-italic text-ink-3 hover:text-ink">
          {a.citation.source} ↗
        </a>
      </blockquote>
    </li>
  );
}

function ExposureRow({ e }: { e: ExposureListing }) {
  return (
    <li className="row py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="min-w-0 break-words text-[15px] text-ink">{e.org}</span>
        <span className="tag text-ink-2">claim</span>
        {e.claimType && <span className="stamp stamp-ink">{e.claimType}</span>}
      </div>
      <p className="num mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11.5px] text-ink-3">
        {e.sector && <span>sector · {e.sector}</span>}
        {e.group && <span>named by · {e.group}</span>}
        {e.status && <span>status · {e.status}</span>}
        {e.at && <span>{utcDate(e.at)}</span>}
      </p>
    </li>
  );
}

function ExploitRow({ x }: { x: AzExploit }) {
  const epss = epssPercent(x.epss);
  return (
    <li className="row py-4" data-sev={x.kev ? "kev" : undefined}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href={`/cve/${x.cve}`} className="ulink num whitespace-nowrap font-mono text-[16px] font-medium text-ink">
          {x.cve}
        </Link>
        {x.kev && <span className="stamp">KEV</span>}
        {epss && <span className="num font-mono text-[12px] text-ink-2">EPSS {epss}</span>}
      </div>
      {x.title && <p className="mt-1.5 text-[14.5px] leading-snug text-ink">{x.title}</p>}
      <p className="mt-1.5 text-[13px] text-ink-2">
        <span className="label text-ink-3">Why here · </span>
        {x.why.map((w) => REASON_TEXT[w]).join("; ")}
        {x.exposure && (
          <span className="num font-mono text-[12px] text-ink-3">
            {" "}
            ({x.exposure.product}: {x.exposure.count.toLocaleString("en-US")} hosts seen by scan{x.exposure.asOf ? `, ${x.exposure.asOf.slice(0, 10)}` : ""})
          </span>
        )}
      </p>
      {x.actors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {x.actors.map((a) => (
            <li key={a.id} className="text-[13px] leading-snug text-ink-2">
              {a.hasDossier ? (
                <Link href={`/actors/${a.id}`} className="ulink font-display font-bold text-ink">
                  {a.name}
                </Link>
              ) : (
                <span className="font-display font-bold text-ink">{a.name}</span>
              )}
              {" · "}
              <a href={a.url ?? undefined} target="_blank" rel="nofollow noopener noreferrer" className="ulink text-ink-3 hover:text-ink">
                citation ↗
              </a>
              <span className="mt-0.5 block line-clamp-2 italic text-ink-3">“{a.quote}”</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function AzPage() {
  const board = await load();
  const counts = board ? azCounts(board) : null;
  return (
    <>
      <SiteHeader section="Section E · Azerbaijan threat dashboard" />
      <main id="main">
        <PageHead
          kicker="Regional threat picture · Azerbaijan"
          live
          title="Azerbaijan, this week."
          meta={
            board && counts ? (
              <>
                <span>
                  as of <LocalTime iso={board.generatedAt} shape="datetime" fallback={`${board.generatedAt.slice(0, 16).replace("T", " ")} UTC`} />
                </span>
                <span>{fmt(counts.claims_7d)} {counts.claims_7d === 1 ? "claim" : "claims"} · 7 days</span>
                <span>{fmt(counts.adversaries)} adversaries</span>
                <span>{fmt(counts.exposure_listings)} breach listings</span>
                <span>{fmt(counts.exploited_cves)} exploited CVEs</span>
                {counts.linked_iocs !== null && <span>{fmt(counts.linked_iocs)} linked {counts.linked_iocs === 1 ? "IOC" : "IOCs"}</span>}
              </>
            ) : undefined
          }
        >
          <p className="prose-paper mt-6 max-w-[64ch]">{INTRO}</p>
          <p className="mt-3 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-2">
            Campaigns and breach listings are <strong className="font-semibold text-ink">claims</strong> made by third parties, never confirmed
            incidents. We publish listings, not stolen data, and print an attribution only with its quote and source.
          </p>
        </PageHead>

        <div className="sheet pb-4">
          {board === null ? (
            <div className="mt-[var(--sp-section)]">
              <Note>The board is unavailable right now. This is an error on our side, not a quiet week.</Note>
            </div>
          ) : (
            <>
              <section className="mt-[var(--sp-section)]" aria-labelledby="az-campaigns">
                <SectionHead id="az-campaigns" n="01" title="Active campaigns" aside={board.campaigns.ok ? `${board.campaigns.rows.length} group · target pairs` : undefined} />
                {!board.campaigns.ok ? (
                  <Note>{UNAVAILABLE}</Note>
                ) : board.campaigns.rows.length === 0 ? (
                  <Note>No public claim against an Azerbaijani target in the last seven days.</Note>
                ) : (
                  <ol className="rule">
                    {board.campaigns.rows.map((c) => (
                      <CampaignRow key={`${c.group}|${c.target}`} c={c} />
                    ))}
                  </ol>
                )}
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                  Telegram, trackers and leak-site listings only. <em>Our check</em> is the probe we ran when we saw the newest claim:{" "}
                  <em>filtered</em> means the site answered us but not global nodes, usually geo or anti-DDoS filtering. Full ledger:{" "}
                  <Link href="/claims" className="ulink hover:text-ink">
                    /claims
                  </Link>
                  .
                </p>
              </section>

              <section className="mt-[var(--sp-section)]" aria-labelledby="az-adversaries">
                <SectionHead id="az-adversaries" n="02" title="Adversaries targeting Azerbaijan" aside={board.adversaries.ok ? `${board.adversaries.rows.length} cited` : undefined} />
                {!board.adversaries.ok ? (
                  <Note>{UNAVAILABLE}</Note>
                ) : board.adversaries.rows.length === 0 ? (
                  <Note>
                    No adversary with a sourced citation on file yet.
                    {board.adversariesWithheld > 0 && ` ${board.adversariesWithheld} without a citation ${board.adversariesWithheld === 1 ? "is" : "are"} held back.`}
                  </Note>
                ) : (
                  <>
                    <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                      {board.adversaries.rows.map((a) => (
                        <AdversaryCard key={a.id} a={a} />
                      ))}
                    </ul>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                      Each card carries the source that ties the group to Azerbaijan.
                      {board.adversariesWithheld > 0 && ` ${board.adversariesWithheld} more without a sourced citation ${board.adversariesWithheld === 1 ? "is" : "are"} not printed.`} Full roster:{" "}
                      <Link href="/actors" className="ulink hover:text-ink">
                        /actors
                      </Link>
                      .
                    </p>
                  </>
                )}
              </section>

              <section className="mt-[var(--sp-section)]" aria-labelledby="az-exposure">
                <SectionHead id="az-exposure" n="03" title="Breach & leak exposure" aside={board.exposure.ok ? `${board.exposure.rows.length} listings` : undefined} />
                {!board.exposure.ok ? (
                  <Note>{UNAVAILABLE}</Note>
                ) : board.exposure.rows.length === 0 ? (
                  <Note>No Azerbaijani organisation on a breach listing we track.</Note>
                ) : (
                  <ol className="rule">
                    {board.exposure.rows.map((e) => (
                      <ExposureRow key={e.id} e={e} />
                    ))}
                  </ol>
                )}
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                  A listing is someone&apos;s claim that an organisation was breached. We show who was named, by whom and when; never the data, and
                  never a link to it.
                </p>
              </section>

              <section className="mt-[var(--sp-section)]" aria-labelledby="az-exploits">
                <SectionHead
                  id="az-exploits"
                  n="04"
                  title="Exploited now, relevant here"
                  aside={board.exploits.ok && board.exploitsDay ? `snapshot ${board.exploitsDay}` : undefined}
                />
                {!board.exploits.ok ? (
                  <Note>{UNAVAILABLE}</Note>
                ) : board.exploits.rows.length === 0 ? (
                  <Note>
                    {board.exploitsDay
                      ? "None of this week's trending exploits is known-exploited, exposed in Azerbaijan, or used by a group targeting it."
                      : "The exploit watch has not published a snapshot yet."}
                  </Note>
                ) : (
                  <ol className="rule">
                    {board.exploits.rows.map((x) => (
                      <ExploitRow key={x.cve} x={x} />
                    ))}
                  </ol>
                )}
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                  From the week&apos;s{" "}
                  <Link href="/exploits" className="ulink hover:text-ink">
                    Exploit Watch
                  </Link>{" "}
                  board. Host counts are a scan of what answers from the internet, not an inventory.
                </p>
              </section>

              <p className="mt-[var(--sp-section)] font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                Data:{" "}
                <a href="/api/v1/az" className="ulink hover:text-ink">
                  /api/v1/az
                </a>{" "}
                · JSON · no key
              </p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
