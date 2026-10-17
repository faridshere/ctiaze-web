import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CtaBand } from "@/components/site/CtaBand";
import { GlyphChip } from "@/components/GlyphChip";
import { getStories, getStoriesForCve } from "@/lib/stories";
import { kevMeta, epssDetailed, nvdLookup } from "@/lib/cveintel";
import { getWireMentions } from "@/lib/actor-wire";
import { getActorNamesFor } from "@/lib/threatactors";
import { getCitationsForCve } from "@/lib/citations-db";
import { groupCitationsByActor, type CveActorCitationDoc } from "@/lib/citations";
import { EvidenceList } from "@/components/citations/EvidenceList";
import { epssPct } from "@/lib/storysignal";
import { formatStoryDate, jsonLdSafe } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { unstable_cache } from "next/cache";

// ---------------------------------------------------------------------------
// /cve/CVE-YYYY-NNNN — one page per CVE, which is how an analyst actually
// works: "is this exploited, and is it in my estate?" Everything the site
// knows about the id lands here: CISA KEV (observed exploitation, with the
// date it was added), EPSS (a forecast, with its percentile), CVSS from NVD,
// the Shodan exposure census when a dispatch carried one, every dispatch on
// our wire that named the CVE, and the adversaries those dispatches named.
// A reviewer called this the one feature that turns a wire into a tool.
//
// v4: set as a dossier for a flaw. The file tab on the deeper stock carries
// the id, CVSS, KEV with its dates and EPSS as .cells; NVD's description is
// the deck; the dispatches are a ledger of rows whose bottom rule carries
// severity; the adversaries are pressed names. Every figure is a field the
// data already held; a missing one prints nothing.
// ---------------------------------------------------------------------------
const CVE_RE = /^CVE-\d{4}-\d{4,7}$/;

// 12 h (was 1 h, 2026-10-10). Its sources move daily at most: the KEV file is
// re-pulled every 24 h (lib/cveintel.ts), EPSS publishes once a day, an NVD
// record rarely changes, and the wire adds a dispatch every ~2 h. The sitemap
// hands crawlers 400 of these URLs, so an hourly window meant up to 400 NVD +
// EPSS + Mongo fan-outs an hour on one small box for numbers that had not moved.
export const revalidate = 43200;
export const maxDuration = 60;
// Without generateStaticParams Next renders a dynamic segment per request
// (private, no-store) even with `revalidate` set — verified on the sibling
// routes, which are ISR only because they declare it. Pre-build the CVEs the
// newest dispatches name; every other id renders once on demand, then caches.
export const dynamicParams = true;
export async function generateStaticParams(): Promise<Params[]> {
  const stories = await getStories(60).catch(() => []);
  const ids = [...new Set(stories.flatMap((s) => s.cveIds.map((c) => c.toUpperCase())))].filter((c) => CVE_RE.test(c));
  return ids.slice(0, 40).map((id) => ({ id }));
}

type Params = { id: string };

function norm(id: string): string | null {
  // No decodeURIComponent here: Next hands this param already decoded, so a
  // second pass threw URIError on any path containing a bare '%'.
  // Measured after the fix: /cve/notacve now 404s as it should, but /cve/%25
  // still answers 500 — and so do /actors/%25 and /news/%25, which this file
  // does not touch. That remaining 500 comes from Next decoding the route
  // param above the page component, so it is one fix for every dynamic route
  // and not this one; left alone deliberately rather than claimed as fixed.
  const u = id.trim().toUpperCase();
  return CVE_RE.test(u) ? u : null;
}

// One cached read per CVE per 12 h; null when nothing we hold knows the id.
// Without the cache the three keyless upstream fetches (NVD, KEV, EPSS) made
// Next render the route on every request (private, no-store) — ~1.4 s a hit
// and a needless NVD call each time. v2 (2026-09-24): an unknown id caches
// null instead of an `unknown` flag, so no v1 entry may be read back as a real
// page. Off Vercel a null stays in memory only (lib/isr-cache-handler.mjs), so
// made-up ids never reach the persistent cache volume.
const load = (id: string) => loadCached(id);
const loadCached = unstable_cache(loadUncached, ["cve-hub-v2"], { revalidate: 43200 });

async function loadUncached(id: string) {
  // GATE FIRST. A pentest walked made-up-but-well-formed ids (CVE-2013-125701)
  // and each one cost ~3 s of NVD + EPSS + Mongo + roster work before the
  // notFound() below — an unbounded key space, unauthenticated, uncached, one
  // function invocation each, and one keyless NVD call each (NVD allows ~5 per
  // 30 s per IP, so a trickle of junk would have 403'd our real lookups).
  // KEV and our own archive are both already in memory/indexed and cheap, so
  // an id nothing has ever heard of is rejected before the expensive fan-out.
  // The citations read (2026-10-17) is one equality match on `cve`, as cheap as
  // the stories read beside it, and a CVE only a report has tied to an actor is
  // a CVE we know.
  const [kev, stories, citations] = await Promise.all([
    kevMeta().catch(() => new Map()),
    getStoriesForCve(id, 40).catch(() => []),
    getCitationsForCve(id).catch((): CveActorCitationDoc[] => []),
  ]);
  const kevRow = kev.get(id) ?? null;
  if (!kevRow && stories.length === 0 && citations.length === 0) return null;

  const [nvd, epss, wire] = await Promise.all([
    nvdLookup(id).catch(() => null),
    epssDetailed([id]).catch(() => new Map()),
    getWireMentions().catch(() => null),
  ]);
  const epssRow = epss.get(id) ?? null;

  // Adversaries: whichever actors our wire matched on the same dispatches.
  // Names come from one small lookup of just those ids (2026-10-10), not from
  // the whole roster index, which this used to parse on every CVE render.
  const slugs = new Set(stories.map((s) => s.slug));
  const hitsById: { id: string; hits: number }[] = [];
  if (wire) {
    for (const [actorId, mentions] of Object.entries(wire.byActor)) {
      const hits = mentions.filter((m) => slugs.has(m.slug)).length;
      if (hits > 0) hitsById.push({ id: actorId, hits });
    }
  }
  // One names lookup covers both lists: the wire's matches and the cited actors.
  const citedIds = [...new Set(citations.map((c) => c.actor_id).filter(Boolean))];
  const names = await getActorNamesFor([...new Set([...hitsById.map((a) => a.id), ...citedIds])]).catch(
    () => new Map<string, string>(),
  );
  const actors = hitsById.map((a) => ({ id: a.id, name: names.get(a.id) ?? a.id, hits: a.hits }));
  actors.sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name));
  // Shaped here, inside the 12 h cache, so a render does no work on it.
  const citedBy = groupCitationsByActor(citations, names);
  const exposure = stories.map((s) => s.azExposure).find((e) => e && e.globalCount != null) ?? null;
  return { nvd, kevRow, epssRow, stories, actors, citedBy, exposure };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id: raw } = await params;
  const id = norm(raw);
  if (!id) return { title: "CVE not found" };
  const d = await load(id);
  if (!d) return { title: "CVE not found", robots: { index: false } };
  const bits: string[] = [];
  if (d.kevRow) bits.push(`on CISA KEV${d.kevRow.dateAdded ? ` since ${d.kevRow.dateAdded}` : ""}`);
  if (d.epssRow) bits.push(`EPSS ${epssPct(d.epssRow.score)}`);
  if (d.nvd?.cvss != null) bits.push(`CVSS ${d.nvd.cvss}`);
  if (d.stories.length) bits.push(`${d.stories.length} dispatch${d.stories.length === 1 ? "" : "es"} on the wire`);
  const description = bits.length ? `${id}: ${bits.join(" · ")}.` : `${id} on skopnix.`;
  return {
    title: `${id}${d.kevRow ? " — actively exploited" : ""}`,
    description: description.slice(0, 160),
    alternates: { canonical: absoluteUrl(`/cve/${id}`) },
    openGraph: { title: id, description: description.slice(0, 160), url: absoluteUrl(`/cve/${id}`), type: "article" },
  };
}

// The row's bottom rule as a data channel, the same mapping as the wire.
function sevOf(s: { kev: boolean; severity: string | null }): string | undefined {
  if (s.kev) return "kev";
  if (s.severity === "critical") return "critical";
  if (s.severity === "high") return "high";
  return undefined;
}

// A reference link's label: the host and the path's last segment, so an 11px
// mono line never breaks mid-token. The full URL stays in the href.
function refLabel(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? `${u.hostname} · ${decodeURIComponent(last)}` : u.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

// A redaction bar: a filled ink block the width of a word, where a slot must
// exist but the sources state nothing.
function Redacted() {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span aria-hidden className="block h-[1.1em] w-[4.5ch] bg-ink" />
      <span className="label text-ink-3">not stated by sources</span>
    </span>
  );
}

export default async function CvePage({ params }: { params: Promise<Params> }) {
  const { id: raw } = await params;
  const id = norm(raw);
  if (!id) notFound();
  const d = await load(id);
  // Nothing we hold knows this id — neither KEV nor our own archive. Rejected
  // before any upstream call was made (see loadUncached).
  if (!d) notFound();

  const severity = d.nvd?.severity?.toUpperCase() ?? null;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "skopnix", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: id, item: absoluteUrl(`/cve/${id}`) },
    ],
  };
  const kev = d.kevRow;
  const epss = d.epssRow;
  const cvss = d.nvd?.cvss ?? null;
  const refs = (d.nvd?.refs ?? []).slice(0, 8);
  // `?? []`: an entry cached before 2026-10-17 has no citedBy and stays valid
  // until its 12 h window ends, rather than bumping the key and re-fanning-out
  // every CVE page at once.
  const citedBy = d.citedBy ?? [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumb) }} />
      <SiteHeader section="Dossier · Vulnerability" />
      <main id="main">
        {/* The head: the dateline label, the id in mono as the headline, the
            deck. One label only; the stamp carries KEV. */}
        <header className="sheet pt-8 sm:pt-12">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <p className={`label ${kev ? "text-stamp" : "text-ink-3"}`}>
              {kev ? "Actively exploited · CISA KEV" : "Vulnerability"}
              {d.nvd?.published ? ` · NVD published ${d.nvd.published.slice(0, 10)}` : ""}
            </p>
            {kev && (
              <span className="hidden shrink-0 md:block">
                <span className="stamp">Actively exploited</span>
              </span>
            )}
          </div>
          <h1 className="headline mt-4 break-all font-mono text-[clamp(2rem,6vw,4.75rem)] font-medium tracking-[-0.03em] text-ink">{id}</h1>
          {d.nvd?.description && <p className="deck mt-6 max-w-[64ch]">{d.nvd.description}</p>}
          <div className={`mt-6 ${kev ? "oxford" : "rule-b-2"}`} />
        </header>

        {/* The file tab: observation first, forecast second, score last. */}
        <section className="mt-8 border-y border-ink bg-paper-deep sm:mt-10" aria-labelledby="cve-tab">
          <div className="sheet py-6 sm:py-8">
            <h2 id="cve-tab" className="sr-only">
              Signals
            </h2>
            <dl className="cells on-deep grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col justify-between gap-3 py-4 pr-4 lg:pl-4 lg:first:pl-0">
                <dt className={`label ${kev ? "text-stamp" : "text-ink-3"}`}>Exploited in the wild</dt>
                <dd>
                  <span className={`block font-display text-[1.75rem] font-bold leading-none sm:text-[2rem] ${kev ? "text-stamp" : "text-ink"}`}>
                    {kev ? "Yes" : "Not on KEV"}
                  </span>
                  <span className="mt-2 block text-[12.5px] leading-snug text-ink-2">
                    {kev ? (
                      <>
                        <span className="num font-mono">
                          {kev.dateAdded ? `added ${kev.dateAdded}` : "date of addition not stated"}
                          {kev.dueDate ? ` · due ${kev.dueDate}` : ""}
                        </span>
                        {kev.ransomware ? " · known ransomware use" : ""}. An observation, not a forecast.
                      </>
                    ) : (
                      "Not in CISA's catalogue as of the last daily pull. Absence is not proof of safety."
                    )}
                  </span>
                </dd>
              </div>
              <div className="flex flex-col justify-between gap-3 py-4 pl-4 pr-4 lg:pr-4">
                <dt className="label text-ink-3">EPSS · 30-day forecast</dt>
                <dd>
                  {epss ? (
                    <>
                      <span className="num block font-mono text-[2.25rem] leading-none text-ink sm:text-[2.5rem]">{epssPct(epss.score)}</span>
                      <span className="mt-2 block text-[12.5px] leading-snug text-ink-2">
                        Chance of exploitation in the next 30 days
                        {epss.percentile != null ? `, ${Math.round(epss.percentile * 100)}th percentile of all CVEs` : ""}. A forecast; KEV outranks it.
                      </span>
                    </>
                  ) : (
                    <>
                      <Redacted />
                      <span className="mt-2 block text-[12.5px] leading-snug text-ink-2">FIRST has not scored this id yet.</span>
                    </>
                  )}
                </dd>
              </div>
              <div className="flex flex-col justify-between gap-3 py-4 pr-4 lg:pl-4">
                <dt className="label text-ink-3">CVSS · NVD{severity ? ` · ${severity}` : ""}</dt>
                <dd>
                  {cvss != null ? (
                    <>
                      <span className="num block font-mono text-[2.25rem] leading-none text-ink sm:text-[2.5rem]">{cvss.toFixed(1)}</span>
                      <span className="num mt-2 block break-all font-mono text-[11px] leading-snug text-ink-3">{d.nvd?.vector ?? "no vector published"}</span>
                    </>
                  ) : (
                    <>
                      <Redacted />
                      <span className="mt-2 block text-[12.5px] leading-snug text-ink-2">{d.nvd ? "No score published by NVD." : "No NVD record yet."}</span>
                    </>
                  )}
                </dd>
              </div>
              <div className="flex flex-col justify-between gap-3 py-4 pl-4">
                <dt className="label text-ink-3">Internet exposure</dt>
                <dd>
                  {d.exposure?.globalCount != null ? (
                    <>
                      <span className="num block font-mono text-[2.25rem] leading-none text-ink sm:text-[2.5rem]">{d.exposure.globalCount.toLocaleString("en-US")}</span>
                      <span className="mt-2 block text-[12.5px] leading-snug text-ink-2">
                        {d.exposure.product} hosts Shodan could see worldwide
                        {d.exposure.globalAsOfIso ? ` on ${d.exposure.globalAsOfIso.slice(0, 10)}` : ""}. A scan count, not an inventory.
                      </span>
                    </>
                  ) : (
                    <>
                      <Redacted />
                      <span className="mt-2 block text-[12.5px] leading-snug text-ink-2">No exposure census on this CVE&apos;s dispatches.</span>
                    </>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="sheet">
          <div className="grid gap-10 pt-[var(--sp-section)] md:grid-cols-12 md:gap-6">
            {/* The ledger: every dispatch on our wire that named the id. */}
            <section className="md:col-span-8" aria-labelledby="cve-wire">
              <div className="rule-b flex items-baseline justify-between gap-3 pb-2">
                <h2 id="cve-wire" className="label flex items-center gap-2 text-ink">
                  {d.stories.length > 0 && <span aria-hidden className="live-dot" />}
                  On the wire
                </h2>
                <span className="num font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  {d.stories.length} dispatch{d.stories.length === 1 ? "" : "es"}
                </span>
              </div>
              {d.stories.length === 0 ? (
                <p className="label py-6 text-ink-3">No dispatch on our wire has named this CVE yet.</p>
              ) : (
                <ol>
                  {d.stories.map((s) => {
                    const { date } = formatStoryDate(s.publishedAt, "en");
                    return (
                      <li key={s.id} className="row" data-sev={sevOf(s)}>
                        <Link href={`/news/${s.slug}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3.5">
                          <time dateTime={s.publishedAt} className="num whitespace-nowrap font-mono text-[11px] text-ink-3">
                            {date}
                          </time>
                          <span className="text-[15px] leading-[1.3] text-ink underline-offset-[3px] group-hover:underline">{s.titleEn || s.titleAz}</span>
                          <span className="flex items-center gap-1.5">
                            {s.kev ? <span className="stamp">KEV</span> : <GlyphChip category={s.category} />}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* The margin: cited actors with their quotes, adversaries as
                pressed names, then the references. */}
            <aside className="md:col-span-4 md:border-l md:border-rule-soft md:pl-6">
              {citedBy.length > 0 && (
                <section className="mb-10" aria-labelledby="cve-cited">
                  <div className="rule-b pb-2">
                    <h2 id="cve-cited" className="label text-ink">
                      Cited as exploited by
                    </h2>
                  </div>
                  <ol>
                    {citedBy.map((g) => (
                      <li key={g.actorId} className="row py-3">
                        <Link href={`/actors/${g.actorId}`} className="pressed text-[20px] leading-tight text-ink">
                          {g.name}
                        </Link>
                        <EvidenceList evidence={g.evidence} more={g.moreEvidence} />
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[12.5px] leading-snug text-ink-3">
                    Each actor is cited by the quoted source, linked under the quote. A citation is that source&apos;s
                    claim, not our confirmation.
                  </p>
                </section>
              )}

              {d.actors.length > 0 && (
                <section aria-labelledby="cve-actors">
                  <div className="rule-b pb-2">
                    <h2 id="cve-actors" className="label text-ink">
                      Adversaries named alongside it
                    </h2>
                  </div>
                  <ol>
                    {d.actors.map((a) => (
                      <li key={a.id} className="row">
                        <Link href={`/actors/${a.id}`} className="flex items-baseline justify-between gap-3 py-2.5">
                          <span className="pressed min-w-0 truncate text-[20px] leading-tight text-ink">{a.name}</span>
                          <span className="num shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                            {a.hits} dispatch{a.hits === 1 ? "" : "es"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[12.5px] leading-snug text-ink-3">
                    Named in the same reporting as this CVE: association, not attribution.
                  </p>
                </section>
              )}

              <section className={d.actors.length > 0 ? "mt-10" : ""} aria-labelledby="cve-refs">
                <div className="rule-b pb-2">
                  <h2 id="cve-refs" className="label text-ink">
                    References
                  </h2>
                </div>
                <ul className="divide-y divide-rule-soft">
                  <li className="py-2">
                    <a className="ulink num break-all font-mono text-[12px] text-ink-2 hover:text-ink" href={`https://nvd.nist.gov/vuln/detail/${id}`} target="_blank" rel="noopener noreferrer">
                      nvd.nist.gov ↗
                    </a>
                  </li>
                  {kev && (
                    <li className="py-2">
                      <a className="ulink num break-all font-mono text-[12px] text-ink-2 hover:text-ink" href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer">
                        cisa.gov · KEV catalogue ↗
                      </a>
                    </li>
                  )}
                  <li className="py-2">
                    <a className="ulink num break-all font-mono text-[12px] text-ink-2 hover:text-ink" href={`https://api.first.org/data/v1/epss?cve=${id}`} target="_blank" rel="noopener noreferrer">
                      first.org · EPSS ↗
                    </a>
                  </li>
                  {refs.map((r) => (
                    <li key={r} className="py-2">
                      <a className="ulink num break-words font-mono text-[12px] text-ink-2 hover:text-ink" href={r} target="_blank" rel="noopener noreferrer" title={r}>
                        {refLabel(r)} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>

        <div className="mt-[var(--sp-section)]">
          <CtaBand source={`cve-${id}`} heading="Watch this one?" blurb="KEV additions reach Telegram and the KEV-only RSS as they land. Per-CVE email alerts are next: leave an address below for one email when they open." />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
