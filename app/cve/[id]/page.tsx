import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import { CtaBand } from "@/components/site/CtaBand";
import { GlyphChip } from "@/components/GlyphChip";
import { getStories, getStoriesForCve } from "@/lib/stories";
import { kevMeta, epssDetailed, nvdLookup } from "@/lib/cveintel";
import { getWireMentions } from "@/lib/actor-wire";
import { getActorsPageData } from "@/lib/threatactors";
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
// ---------------------------------------------------------------------------
const CVE_RE = /^CVE-\d{4}-\d{4,7}$/;

export const revalidate = 3600;
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
  const u = decodeURIComponent(id).trim().toUpperCase();
  return CVE_RE.test(u) ? u : null;
}

// One cached read per CVE per hour. Without this the three keyless upstream
// fetches (NVD, KEV, EPSS) made Next render the route on every request
// (private, no-store) — ~1.4 s a hit and a needless NVD call each time.
const load = (id: string) => loadCached(id);
const loadCached = unstable_cache(loadUncached, ["cve-hub-v1"], { revalidate: 3600 });

async function loadUncached(id: string) {
  // GATE FIRST. A pentest walked made-up-but-well-formed ids (CVE-2013-125701)
  // and each one cost ~3 s of NVD + EPSS + Mongo + roster work before the
  // notFound() below — an unbounded key space, unauthenticated, uncached, one
  // function invocation each, and one keyless NVD call each (NVD allows ~5 per
  // 30 s per IP, so a trickle of junk would have 403'd our real lookups).
  // KEV and our own archive are both already in memory/indexed and cheap, so
  // an id nothing has ever heard of is rejected before the expensive fan-out.
  const [kev, stories] = await Promise.all([
    kevMeta().catch(() => new Map()),
    getStoriesForCve(id, 40).catch(() => []),
  ]);
  const kevRow = kev.get(id) ?? null;
  if (!kevRow && stories.length === 0) {
    return { nvd: null, kevRow: null, epssRow: null, stories: [], actors: [], exposure: null, unknown: true };
  }

  const [nvd, epss, wire, roster] = await Promise.all([
    nvdLookup(id).catch(() => null),
    epssDetailed([id]).catch(() => new Map()),
    getWireMentions().catch(() => null),
    getActorsPageData().catch(() => null),
  ]);
  const epssRow = epss.get(id) ?? null;

  // Adversaries: whichever actors our wire matched on the same dispatches.
  const slugs = new Set(stories.map((s) => s.slug));
  const names = new Map((roster?.index ?? []).map((a) => [a.id, a.name]));
  const actors: { id: string; name: string; hits: number }[] = [];
  if (wire) {
    for (const [actorId, mentions] of Object.entries(wire.byActor)) {
      const hits = mentions.filter((m) => slugs.has(m.slug)).length;
      if (hits > 0) actors.push({ id: actorId, name: names.get(actorId) ?? actorId, hits });
    }
    actors.sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name));
  }
  const exposure = stories.map((s) => s.azExposure).find((e) => e && e.globalCount != null) ?? null;
  return { nvd, kevRow, epssRow, stories, actors, exposure, unknown: false };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id: raw } = await params;
  const id = norm(raw);
  if (!id) return { title: "CVE not found" };
  const d = await load(id);
  if (d.unknown) return { title: "CVE not found", robots: { index: false } };
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

export default async function CvePage({ params }: { params: Promise<Params> }) {
  const { id: raw } = await params;
  const id = norm(raw);
  if (!id) notFound();
  const d = await load(id);
  // Nothing we hold knows this id — neither KEV nor our own archive. Rejected
  // before any upstream call was made (see loadUncached).
  if (d.unknown) notFound();

  const kicker = d.kevRow ? "actively exploited · CISA KEV" : "vulnerability";
  const severity = d.nvd?.severity?.toUpperCase() ?? null;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "skopnix", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: id, item: absoluteUrl(`/cve/${id}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumb) }} />
      <SiteHeader />
      <main id="main">
        <PageHead
          kicker={kicker}
          live={!!d.kevRow}
          title={<span className="font-mono tracking-[-0.02em]">{id}</span>}
          meta={
            <>
              {severity && `NVD ${severity}`}
              {severity && d.nvd?.cvss != null && ` ${d.nvd.cvss}`}
              {d.nvd?.published && ` · published ${d.nvd.published.slice(0, 10)}`}
              {d.stories.length > 0 && ` · ${d.stories.length} on the wire`}
            </>
          }
        >
          {d.nvd?.description && (
            <p className="mt-6 max-w-[42rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
              {d.nvd.description}
            </p>
          )}
        </PageHead>

        {/* The signal panel: observation first, forecast second, score last. */}
        <section className="mx-auto mt-10 w-full max-w-[80rem] px-[var(--sp-gutter)]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Panel limb={!!d.kevRow} className="p-5">
              <Kicker live={!!d.kevRow}>Exploited in the wild</Kicker>
              <p className={`mt-3 font-display text-2xl font-semibold ${d.kevRow ? "text-accent-critical" : "text-ink-primary"}`}>
                {d.kevRow ? "Yes" : "Not on KEV"}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                {d.kevRow
                  ? `CISA added it ${d.kevRow.dateAdded ?? "(date unknown)"}${d.kevRow.ransomware ? ", with known ransomware use" : ""}. An observation, not a forecast.`
                  : "Not in CISA's Known Exploited Vulnerabilities catalogue as of the last daily pull. Absence is not proof of safety."}
              </p>
            </Panel>
            <Panel className="p-5">
              <Kicker>EPSS · 30-day forecast</Kicker>
              <p className="mt-3 font-display text-2xl font-semibold text-ink-primary">{d.epssRow ? epssPct(d.epssRow.score) : "—"}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                {d.epssRow
                  ? `Chance of exploitation in the next 30 days${d.epssRow.percentile != null ? `, ${Math.round(d.epssRow.percentile * 100)}th percentile of all CVEs` : ""}. A forecast; KEV outranks it.`
                  : "FIRST has not scored this id yet."}
              </p>
            </Panel>
            <Panel className="p-5">
              <Kicker>CVSS · NVD</Kicker>
              <p className="mt-3 font-display text-2xl font-semibold text-ink-primary">{d.nvd?.cvss != null ? d.nvd.cvss.toFixed(1) : "—"}</p>
              <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-ink-muted">
                {d.nvd?.vector ?? (d.nvd ? "no vector published" : "no NVD record yet")}
              </p>
            </Panel>
            <Panel className="p-5">
              <Kicker>Internet exposure</Kicker>
              <p className="mt-3 font-display text-2xl font-semibold text-ink-primary">
                {d.exposure?.globalCount != null ? d.exposure.globalCount.toLocaleString("en-US") : "—"}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                {d.exposure?.globalCount != null
                  ? `${d.exposure.product} hosts Shodan could see worldwide${d.exposure.globalAsOfIso ? ` on ${d.exposure.globalAsOfIso.slice(0, 10)}` : ""}. A scan count, not an inventory.`
                  : "No exposure census on this CVE's dispatches."}
              </p>
            </Panel>
          </div>
        </section>

        {d.actors.length > 0 && (
          <section className="mx-auto mt-14 w-full max-w-[80rem] px-[var(--sp-gutter)]">
            <Kicker>Adversaries named alongside it</Kicker>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              actors our dispatches named in the same reporting — association, not attribution
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.actors.map((a) => (
                <Link
                  key={a.id}
                  href={`/actors/${a.id}`}
                  className="rounded-[var(--radius-chip)] border border-hairline px-2.5 py-1 font-mono text-[12px] text-ink-primary transition-colors hover:border-brand hover:text-brand"
                >
                  {a.name}
                  <span className="ml-2 text-ink-muted">{a.hits}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto mt-14 w-full max-w-[80rem] px-[var(--sp-gutter)]">
          <div className="flex items-baseline justify-between gap-3">
            <Kicker live={d.stories.length > 0}>On the wire</Kicker>
            <span className="font-mono text-[11px] text-ink-muted">{d.stories.length}</span>
          </div>
          {d.stories.length === 0 ? (
            <p className="mt-4 font-mono text-[12px] text-ink-muted">No dispatch on our wire has named this CVE yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
              {d.stories.map((s) => {
                const { date } = formatStoryDate(s.publishedAt, "en");
                return (
                  <li key={s.id}>
                    <Link href={`/news/${s.slug}`} className="group grid grid-cols-[6.5rem_1fr_auto] items-baseline gap-4 py-3.5 transition-colors hover:bg-surface-hover">
                      <time dateTime={s.publishedAt} className="whitespace-nowrap font-mono text-[11px] tabular-nums text-ink-muted">{date}</time>
                      <span className="text-[15px] leading-snug text-ink-primary transition-colors group-hover:text-brand">{s.titleEn || s.titleAz}</span>
                      <GlyphChip category={s.category} className="hidden sm:inline-block" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mx-auto mt-14 w-full max-w-[80rem] px-[var(--sp-gutter)]">
          <Kicker>References</Kicker>
          <ul className="mt-4 space-y-1.5 font-mono text-[12px]">
            <li><a className="text-ink-secondary hover:text-brand" href={`https://nvd.nist.gov/vuln/detail/${id}`} target="_blank" rel="noopener noreferrer">nvd.nist.gov ↗</a></li>
            {d.kevRow && (
              <li><a className="text-ink-secondary hover:text-brand" href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer">cisa.gov · KEV catalogue ↗</a></li>
            )}
            <li><a className="text-ink-secondary hover:text-brand" href={`https://api.first.org/data/v1/epss?cve=${id}`} target="_blank" rel="noopener noreferrer">first.org · EPSS ↗</a></li>
            {(d.nvd?.refs ?? []).slice(0, 8).map((r) => (
              <li key={r}><a className="break-all text-ink-secondary hover:text-brand" href={r} target="_blank" rel="noopener noreferrer">{r.replace(/^https?:\/\//, "")} ↗</a></li>
            ))}
          </ul>

        </section>

        <div className="mt-[var(--sp-section)]">
          <CtaBand source={`cve-${id}`} heading="Watch this one?" blurb="Early access opens alerts first — one email when a CVE you follow lands on KEV or an adversary you follow lands on the wire. Nothing else, ever." />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
