import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { LocalTime } from "@/components/site/LocalTime";
import { getClaims, getClaimStats, type ClaimRow } from "@/lib/claims";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Claims vs reality — attacks claimed against Azerbaijan",
  description:
    "Hacktivist DDoS, defacement and leak claims against Azerbaijan, picked up within minutes from Telegram, trackers and leak sites, each with a live reachability check.",
  alternates: { canonical: absoluteUrl("/claims") },
};

const getData = unstable_cache(
  async () => {
    const [rows, stats] = await Promise.all([getClaims(150), getClaimStats()]);
    return { rows, stats };
  },
  ["claims-v1"],
  { revalidate: 300 }
);

const KIND_LABEL: Record<ClaimRow["kind"], string> = {
  telegram: "Telegram",
  bluesky: "Tracker",
  ransomware: "Leak site",
};

function utc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

// The verdict of our own check: "up" when the target answered us, "filtered"
// when it answered us but none of the global nodes (geo or anti-DDoS filtering,
// usually), "unreachable" otherwise. Text first, colour second.
function verdict(c: { here: string; checkhost: string }): { label: string; tone: string } {
  const up = c.here.startsWith("HTTP 2") || c.here.startsWith("HTTP 3");
  const chZero = c.checkhost.startsWith("0/");
  if (up && chZero) return { label: "filtered", tone: "text-caution" };
  if (up) return { label: "up", tone: "text-better" };
  return { label: "unreachable", tone: "text-worse" };
}

// The claims board, set as a ledger of the paper: every row is a claim made by
// someone else, dated, attributed to its channel, and checked by us.
export default async function ClaimsPage() {
  const { rows, stats } = await getData();
  return (
    <>
      <SiteHeader section="Section C · Claims vs reality · Azerbaijan" />
      <main id="main">
        <PageHead
          kicker="Hacktivist & leak-site watch · Azerbaijan"
          live
          title="Claims vs reality."
          meta={
            <>
              <span>{stats.total30d.toLocaleString("en-US")} claims in 30 days</span>
              <span>checked every 5 minutes</span>
            </>
          }
        />

        <div className="sheet grid gap-10 pt-8 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-7">
            <p className="prose-paper dropcap">
              Every row is a claim made by someone else: a hacktivist channel, a tracker that reposts claims, or a
              ransomware leak site. When we see a claim we check the named target ourselves, from our server and from
              check-host.net nodes worldwide. <em>Filtered</em> means the site answered us but not the global nodes,
              which usually means geo or anti-DDoS filtering rather than an outage.
            </p>
          </div>
          {stats.groups.length > 0 && (
            <div className="md:col-span-5 md:border-l md:border-rule-soft md:pl-6">
              <h2 className="label rule-b pb-2 text-ink">Most active claimants · 30 days</h2>
              <ol className="divide-y divide-rule-soft">
                {stats.groups.map((g) => (
                  <li key={g.group} className="flex items-baseline justify-between gap-4 py-2">
                    <span className="min-w-0 truncate text-[14px] text-ink">{g.group}</span>
                    <span className="num font-mono text-[13px] text-ink-2">{g.n.toLocaleString("en-US")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <section className="sheet pt-10" aria-labelledby="claims-head">
          <div className="flex items-center gap-4">
            <h2 id="claims-head" className="label whitespace-nowrap text-ink">
              The ledger · newest first
            </h2>
            <span aria-hidden className="h-[2px] flex-1 bg-ink" />
            <span className="label whitespace-nowrap text-ink-3">{rows.length} claims shown</span>
          </div>
          {rows.length === 0 ? (
            <p className="label py-8 text-ink-3">No claims recorded yet.</p>
          ) : (
            <ol className="mt-2">
              {rows.map((r) => {
                const unreachable = r.checks.some((c) => verdict(c).label === "unreachable");
                return (
                  <li key={r.id} className="row py-4" data-sev={unreachable ? "high" : undefined}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <LocalTime iso={r.at} shape="datetime" fallback={utc(r.at)} className="num font-mono text-[11px] text-ink-3" />
                      <span className="tag text-ink-2">{KIND_LABEL[r.kind]}</span>
                      {r.claimType && <span className="stamp stamp-ink">{r.claimType}</span>}
                      <span className="label text-ink">{r.group}</span>
                    </div>
                    <p dir="auto" className="mt-2 max-w-[70ch] text-[15.5px] leading-snug text-ink">
                      {r.summaryEn ?? r.text}
                    </p>
                    {(r.targets.length > 0 || r.checks.length > 0) && (
                      <dl className="num mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] text-ink-3">
                        {r.checks.length > 0
                          ? r.checks.map((c) => {
                              const v = verdict(c);
                              return (
                                <div key={c.target} className="flex gap-2">
                                  <dt>{c.target.replace(/^https?:\/\//, "").replace(/\/$/, "")}</dt>
                                  <dd>
                                    <span className={v.tone}>{v.label}</span>
                                    {c.checkhost && <span> · {c.checkhost.replace(" check-host nodes OK", " nodes ok")}</span>}
                                  </dd>
                                </div>
                              );
                            })
                          : r.targets.map((t) => (
                              <div key={t}>
                                <dt className="sr-only">target</dt>
                                <dd>{t}</dd>
                              </div>
                            ))}
                      </dl>
                    )}
                    {r.url && (
                      <a
                        href={r.url}
                        rel="nofollow noopener noreferrer"
                        target="_blank"
                        className="label ulink mt-2 inline-block text-ink-3 hover:text-ink"
                      >
                        Source ↗
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
            Data:{" "}
            <a href="/api/v1/claims" className="ulink hover:text-ink">
              /api/v1/claims
            </a>{" "}
            · JSON · no key
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
