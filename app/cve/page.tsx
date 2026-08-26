import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SpektrStrip } from "@/components/SpektrStrip";
import { GlyphChip } from "@/components/GlyphChip";
import { getCveIndex } from "@/lib/cve";
import { getStories } from "@/lib/stories";
import { kevSet, epssMap, nvdLookup } from "@/lib/cveintel";
import { cveIntelIdSet } from "@/lib/cveintel-page";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 21600; // 6h — CVE authority data moves slowly

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/cve", dil, en,
    azTitle: "CVE reyestri — aktiv istismar, EPSS, CVSS",
    enTitle: "CVE registry — active exploitation, EPSS, CVSS",
    azDesc: "ctiaze arxivində adı çəkilən bütün CVE-lər — CISA KEV aktiv istismar statusu, FIRST EPSS istismar ehtimalı, NVD CVSS və təsvir, hər biri əlaqəli dispaça bağlı.",
    enDesc: "Every CVE mentioned in the ctiaze archive — CISA KEV active-exploitation status, FIRST EPSS exploit probability, NVD CVSS and description, each linked to its story.",
  });
}

// NVD is keyless + rate-limited, so each CVE's detail is cached for a week; the
// page's own 6h ISR serves stale while these refresh in the background, so a slow
// NVD never blocks a reader.
const nvdCached = unstable_cache(async (cve: string) => nvdLookup(cve), ["cve-nvd-v1"], {
  revalidate: 604800,
});

const WINDOW = 150;
const NVD_CAP = 24; // enrich the highest-priority CVEs with CVSS/description

function pct(epss: number | null): string | null {
  if (epss == null) return null;
  const p = epss * 100;
  return `${p.toFixed(p < 1 ? 2 : 0)}%`;
}

export default async function CvePage() {
  const en = (await getLocale()) === "en";
  const [index, stories] = await Promise.all([getCveIndex(WINDOW), getStories(WINDOW).catch(() => [])]);
  const cveBearing = stories.filter((s) => s.cveIds.length > 0);
  const cves = index.map((x) => x.cve);
  // Which listed ids have a /cve/[id] explainer page (one indexed $in query) —
  // only those become links, so the registry never points into a 404.
  const [kev, epss, intelIds] = await Promise.all([
    kevSet(),
    epssMap(cves),
    cveIntelIdSet(cves).catch(() => new Set<string>()),
  ]);

  // Priority order for NVD enrichment + display: KEV first, then EPSS, then recency.
  const ranked = [...index].sort(
    (a, b) =>
      Number(kev.has(b.cve)) - Number(kev.has(a.cve)) ||
      (epss.get(b.cve) ?? -1) - (epss.get(a.cve) ?? -1) ||
      b.latest.localeCompare(a.latest)
  );
  const nvdTargets = ranked.slice(0, NVD_CAP).map((x) => x.cve);
  const nvdResults = await Promise.allSettled(nvdTargets.map((c) => nvdCached(c)));
  const nvd = new Map<string, Awaited<ReturnType<typeof nvdLookup>>>();
  nvdTargets.forEach((c, i) => {
    const r = nvdResults[i];
    if (r.status === "fulfilled" && r.value) nvd.set(c, r.value);
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-[52rem] flex-1 px-[var(--sp-gutter)] py-[var(--sp-section)]">
        <h1 className="font-headline text-[length:var(--t-h2)] font-semibold tracking-[-0.01em] text-ink-primary">
          {en ? "CVE registry" : "CVE reyestri"}
        </h1>
        <p className="mt-2 font-mono text-[length:var(--t-meta)] text-ink-muted">
          {en ? "extracted from the last " : "son "}{WINDOW}{en ? " dispatches · " : " dispaçdan çıxarılan "}<span className="tabular-nums text-ink-secondary">{index.length}</span> CVE · CISA KEV · FIRST EPSS · NVD
        </p>

        {cveBearing.length > 0 && (
          <div className="mt-6">
            <SpektrStrip
              stories={cveBearing}
              variant="mini"
              caption={en ? "spectrum over CVE-bearing dispatches" : "CVE daşıyan dispaçlar üzrə spektr"}
            />
          </div>
        )}

        {index.length === 0 ? (
          <p className="mt-10 font-mono text-[length:var(--t-meta)] text-ink-muted">
            {en ? "no CVEs in the current window" : "hazırkı pəncərədə CVE yoxdur"}
          </p>
        ) : (
          <div className="mt-8">
            {ranked.map((row) => {
              const isKev = kev.has(row.cve); // live CISA KEV only — never the roundup-bled flag
              const ep = pct(epss.get(row.cve) ?? null);
              const info = nvd.get(row.cve);
              return (
                <article
                  key={row.cve}
                  id={row.cve}
                  className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-hairline py-[var(--sp-row)] first:border-t-0 min-[640px]:grid-cols-[9.5rem_minmax(0,1fr)] scroll-mt-16 [content-visibility:auto] [contain-intrinsic-size:auto_150px]"
                >
                  {/* gutter: CVE id (→ explainer page when one exists) + latest story date.
                      h2 so heading navigation works on the registry's ~500 rows. */}
                  <div className="min-w-0">
                    {intelIds.has(row.cve) ? (
                      <h2 className="m-0 font-normal">
                        <Link
                          href={`/cve/${row.cve}`}
                          className="block break-all font-mono text-[length:var(--t-meta)] text-ink-primary transition-colors hover:text-brand [overflow-wrap:anywhere]"
                        >
                          {row.cve}
                        </Link>
                      </h2>
                    ) : (
                      <h2 className="m-0 break-all font-mono text-[length:var(--t-meta)] font-normal text-ink-primary [overflow-wrap:anywhere]">
                        {row.cve}
                      </h2>
                    )}
                    <div className="mt-0.5 font-mono text-[length:var(--t-micro)] tabular-nums text-ink-muted">
                      {row.latest.slice(0, 10)}
                    </div>
                  </div>

                  {/* main */}
                  <div className="min-w-0">
                    {/* enrichment chips — only when the datum was fetched */}
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.06em]">
                      {isKev && (
                        <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-semibold text-surface">
                          KEV
                        </span>
                      )}
                      {ep && (
                        <span className="rounded-[var(--radius-chip)] border border-ink-secondary px-1 py-px text-ink-secondary">
                          EPSS {ep}
                        </span>
                      )}
                      {info?.cvss != null && (
                        <span className="rounded-[var(--radius-chip)] border border-ink-secondary px-1 py-px text-ink-secondary tabular-nums">
                          CVSS {info.cvss}
                        </span>
                      )}
                      {row.stories[0] && <GlyphChip category={row.stories[0].category} />}
                    </div>

                    {info?.description && (
                      <p className="mt-2 text-[length:var(--t-body)] leading-[1.55] text-ink-secondary">
                        {info.description.length > 220
                          ? info.description.slice(0, 220).trimEnd() + "…"
                          : info.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[length:var(--t-meta)]">
                      {row.stories.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/xeber/${s.slug}`}
                          className="text-ink-secondary transition-colors hover:text-brand"
                          title={en ? s.titleEn : s.titleAz}
                        >
                          → {en ? "dispatch" : "dispaç"}: {(en ? s.titleEn : s.titleAz).length > 46 ? (en ? s.titleEn : s.titleAz).slice(0, 46) + "…" : (en ? s.titleEn : s.titleAz)}
                        </Link>
                      ))}
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${row.cve}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="uppercase tracking-wider text-ink-muted transition-colors hover:text-brand"
                      >
                        NVD ↗
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-12 border-t border-hairline pt-6 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] leading-relaxed text-ink-muted">
          {en ? "sources: CISA KEV · FIRST EPSS · NIST NVD — keyless, free. EPSS = 30-day exploit probability. KEV = actively exploited in the wild." : "mənbələr: CISA KEV · FIRST EPSS · NIST NVD — açarsız, pulsuz. EPSS = 30 günlük istismar ehtimalı. KEV = vəhşi təbiətdə aktiv istismar."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
