import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CountUp } from "@/components/CountUp";
import { getSituation, type TopActor, type Priority } from "@/lib/landscape";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 3600;

const BASE = "https://ctiaze.tech";

// Dark-register category hex (--d-cat-*). The page is `.ops` (always dark), so the
// literal dark values are correct by construction — no dynamic Tailwind class that
// the JIT could purge, no register drift.
const CAT_HEX: Record<string, string> = {
  ransomware: "#e0729a",
  other: "#82858f",
  research: "#8db98a",
  vuln: "#7ea4cf",
  policy: "#94a0b4",
  breach: "#bc9062",
  malware: "#b08fd0",
  exploit: "#c98a5a",
  apt: "#57b6a6",
  "supply-chain": "#a5a7ae",
};

const AZ_MON = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const EN_MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmtMonth(ym: string | null, en: boolean): string {
  if (!ym) return "—";
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const name = (en ? EN_MON : AZ_MON)[parseInt(m[2], 10) - 1] ?? ym;
  return `${name} ${m[1]}`;
}

function fmtDate(iso: string | null, en: boolean): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(en ? "en-GB" : "az-AZ", {
    timeZone: "Asia/Baku", day: "2-digit", month: "short", year: "numeric",
  }).format(d);
}

const nf = (n: number) => n.toLocaleString("en-US");

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/situation", dil, en,
    azTitle: "Kibertəhlükə vəziyyəti — aylıq hesabat",
    enTitle: "Cyber threat situation — monthly report",
    azDesc:
      "skopnix arxivinə əsaslanan aylıq kibertəhlükə vəziyyəti: ən çox rast gəlinən hücum növləri, aktiv təhdid aktorları və Azərbaycan təşkilatları üçün prioritet müdafiə addımları.",
    enDesc:
      "Monthly cyber threat situation from the skopnix archive: the most common attack types, the most active threat actors, and prioritized defensive actions for organizations in Azerbaijan.",
  });
}

export default async function VeziyyetPage() {
  const en = (await getLocale()) === "en";
  const s = await getSituation();

  // Graceful degrade — the route always exists; if the DB is unreachable we still
  // render the shell with an honest note rather than a 404 or fabricated numbers.
  if (!s) {
    return (
      <div className="ops flex min-h-screen flex-col">
        <Header />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
          <h1 className="font-headline text-3xl font-bold uppercase text-ink-primary sm:text-4xl">
            {en ? "Cyber threat situation" : "Kibertəhlükə vəziyyəti"}
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
            {en
              ? "The report is being regenerated — data is momentarily unavailable. Please check back shortly."
              : "Hesabat yenidən hazırlanır — məlumat hazırda əlçatan deyil. Bir azdan yenidən baxın."}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const { period, trends, landscape, priorities } = s;
  const title = en ? "Cyber threat situation" : "Kibertəhlükə vəziyyəti";

  // ---- JSON-LD ----
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: en ? "Cyber threat situation — monthly report" : "Kibertəhlükə vəziyyəti — aylıq hesabat",
    description: en
      ? "Monthly threat situation from the skopnix archive: attack types, active actors, and prioritized defenses."
      : "skopnix arxivinə əsaslanan aylıq təhdid vəziyyəti: hücum növləri, aktiv aktorlar və prioritet müdafiələr.",
    inLanguage: en ? "en" : "az",
    datePublished: period.generatedAt ?? undefined,
    dateModified: period.generatedAt ?? undefined,
    url: `${BASE}/situation`,
    mainEntityOfPage: `${BASE}/situation`,
    isAccessibleForFree: true,
    keywords: trends.attackTypes.slice(0, 8).map((a) => a.name).join(", ") || undefined,
    author: { "@type": "Organization", name: "skopnix", url: BASE },
    publisher: { "@type": "Organization", name: "skopnix", url: BASE },
  };
  const datasetClean =
    trends.monthly.length >= 2 && trends.attackTypes.length > 0 && !!period.from && !!period.to;
  const dataset = datasetClean
    ? {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: en ? "Azerbaijan cyber-incident trends" : "Azərbaycan kiber-hadisə trendləri",
        description: en
          ? `Monthly frequency of attack types across the skopnix threat-intel archive, ${period.from} to ${period.to}.`
          : `skopnix kəşfiyyat arxivində hücum növlərinin aylıq tezliyi, ${period.from} — ${period.to}.`,
        inLanguage: en ? "en" : "az",
        temporalCoverage: `${period.from}/${period.to}`,
        isAccessibleForFree: true,
        url: `${BASE}/situation`,
        creator: { "@type": "Organization", name: "skopnix", url: BASE },
        variableMeasured: trends.attackTypes.slice(0, 10).map((a) => a.name),
        measurementTechnique: en
          ? "Count of attack-type mentions across curated threat-intel items"
          : "Kurasiya olunmuş kəşfiyyat xəbərlərində hücum növü qeydlərinin sayı",
      }
    : null;

  // ---- derived render data ----
  const statBand = trends.attackTypes.slice(0, 4);
  const cats = trends.categories.slice(0, 8);
  const maxCat = cats.reduce((m, c) => Math.max(m, c.count), 0) || 1;
  const maxVictim = landscape.topActors.reduce((m, a) => Math.max(m, a.victimCount), 0) || 1;
  const landscapeText = en
    ? landscape.summaryEn || landscape.summaryAz
    : landscape.summaryAz || landscape.summaryEn;
  const trendText = en ? trends.summaryEn || trends.summaryAz : trends.summaryAz || trends.summaryEn;

  // Monthly incident-volume chart (pure inline SVG, literal dark hex). Linear scale
  // — the spike to record volume is the true story; nonzero months get a 2px floor
  // so early low-volume months stay perceptible without misstating the shape.
  const CH_W = 620;
  const CH_H = 96;
  const GAP = 3;
  const n = trends.monthly.length;
  const maxItems = trends.peak?.items || 1;
  const barW = n > 0 ? (CH_W - GAP * (n - 1)) / n : 0;
  const bars = trends.monthly.map((m, i) => {
    const h = m.items > 0 ? Math.max(2, Math.round((m.items / maxItems) * (CH_H - 2))) : 0;
    return {
      x: i * (barW + GAP),
      y: CH_H - h,
      h,
      w: barW,
      isPeak: m.month === trends.peak?.month,
      month: m.month,
      items: m.items,
    };
  });

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(article) }} />
        {dataset && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(dataset) }} />
        )}

        {/* (1) headline + period */}
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.24em] text-brand">
          <span aria-hidden className="h-px w-5 bg-brand" />
          {(en ? "Monthly report" : "Aylıq hesabat") + " · " + fmtMonth(period.to, en)}
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl font-bold uppercase text-ink-primary sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {en
            ? `What the ${period.months ?? ""}-month archive shows${
                landscape.totalItems ? ` across ${nf(landscape.totalItems)} curated items` : ""
              }: which attacks recur, who is most active, and what to fix first.`
            : `${period.months ?? ""} aylıq arxivin göstərdiyi${
                landscape.totalItems ? `, ${nf(landscape.totalItems)} kurasiya olunmuş hadisə üzrə` : ""
              }: hansı hücumlar təkrarlanır, kim ən aktivdir və əvvəlcə nəyi düzəltməli.`}
        </p>
        <p className="mt-3 font-mono text-[length:var(--t-meta)] text-ink-muted">
          {`${fmtMonth(period.from, en)} — ${fmtMonth(period.to, en)}`}
          {period.months ? ` · ${period.months} ${en ? "months" : "ay"}` : ""}
          {period.generatedAt ? ` · ${en ? "updated" : "yenilənmə"} ${fmtDate(period.generatedAt, en)}` : ""}
        </p>

        {/* (2) stat band — top attack types, honest CountUp figures */}
        {statBand.length > 0 && (
          <dl className="mt-10 grid grid-cols-2 divide-x divide-hairline border-y border-hairline sm:grid-cols-4">
            {statBand.map((it, i) => (
              <div key={it.name} data-sc={i > 1 ? "2" : undefined} className="flex flex-col py-4 pl-4 first:pl-0 sm:py-5">
                <dt className="order-2 mt-1 font-mono text-[length:var(--t-micro)] uppercase tracking-widest text-ink-muted">
                  {it.name}
                </dt>
                <dd className="order-1 font-headline text-2xl font-bold text-ink-primary sm:text-[1.75rem]">
                  <CountUp value={it.count} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* trend visuals — monthly volume (SVG) + category mix (CSS bars) */}
        {(trends.monthly.length > 0 || cats.length > 0) && (
          <section data-sc className="mt-14">
            <div className="flex items-baseline gap-3">
              <h2 className="font-headline text-xl text-brand">{en ? "The trend" : "Trend"}</h2>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[11px] text-ink-muted">
                {period.months ? `${period.months} ${en ? "mo" : "ay"}` : ""}
              </span>
            </div>

            {trends.monthly.length > 0 && (
              <figure className="mt-6">
                <svg
                  viewBox={`0 0 ${CH_W} ${CH_H}`}
                  className="h-24 w-full"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={
                    en
                      ? `Monthly incident volume from ${fmtMonth(period.from, true)} to ${fmtMonth(period.to, true)}, peaking at ${nf(trends.peak?.items ?? 0)} in ${fmtMonth(trends.peak?.month ?? null, true)}.`
                      : `Aylıq hadisə həcmi: ${fmtMonth(period.from, false)} — ${fmtMonth(period.to, false)}, pik ${nf(trends.peak?.items ?? 0)} (${fmtMonth(trends.peak?.month ?? null, false)}).`
                  }
                >
                  <line x1="0" y1={CH_H - 0.5} x2={CH_W} y2={CH_H - 0.5} stroke="#23262e" strokeWidth="1" />
                  {bars.map((b) => (
                    <rect
                      key={b.month}
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill={b.isPeak ? "#ff5a1f" : "#3a3f4a"}
                    >
                      <title>{`${fmtMonth(b.month, en)}: ${nf(b.items)}`}</title>
                    </rect>
                  ))}
                </svg>
                <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[length:var(--t-meta)] text-ink-muted">
                  <span>{fmtMonth(period.from, en)}</span>
                  <span className="text-ink-secondary">
                    <span className="text-brand">{nf(trends.peak?.items ?? 0)}</span>
                    {` · ${en ? "peak" : "pik"} ${fmtMonth(trends.peak?.month ?? null, en)}`}
                  </span>
                  <span>{fmtMonth(period.to, en)}</span>
                </figcaption>
              </figure>
            )}

            {cats.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                  {en ? "By category" : "Kateqoriya üzrə"}
                </p>
                <ul className="space-y-2">
                  {cats.map((c) => (
                    <li key={c.name} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate font-mono text-[13px] uppercase tracking-wide text-ink-secondary" title={c.name}>
                        {c.name}
                      </span>
                      <span className="h-2.5 flex-1 bg-surface-raised" style={{ borderRadius: "var(--radius-chip)" }}>
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.max(3, Math.round((c.count / maxCat) * 100))}%`,
                            background: CAT_HEX[c.name] ?? "#82858f",
                            borderRadius: "var(--radius-chip)",
                          }}
                        />
                      </span>
                      <span className="w-14 shrink-0 text-right font-mono text-[13px] tabular-nums text-ink-primary">
                        {nf(c.count)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {trendText && (
              <p className="mt-6 max-w-3xl border-l-2 border-l-hairline pl-4 text-[14px] leading-relaxed text-ink-secondary">
                {trendText}
              </p>
            )}
          </section>
        )}

        {/* (3) landscape summary + top-actor list */}
        <section data-sc className="mt-16">
          <div className="flex items-baseline gap-3">
            <h2 className="font-headline text-xl text-brand">{en ? "The landscape" : "Mənzərə"}</h2>
            <span aria-hidden className="h-px flex-1 bg-hairline" />
            {landscape.kevCount !== null && (
              <span className="font-mono text-[11px] text-ink-muted">
                {`${landscape.kevCount} KEV`}
              </span>
            )}
          </div>

          {landscapeText && (
            <p className="mt-4 max-w-3xl leading-relaxed text-ink-secondary">{landscapeText}</p>
          )}

          {landscape.topActors.length > 0 && (
            <>
              <p className="mb-3 mt-8 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                {en ? "Most active actors — by observed victims" : "Ən aktiv aktorlar — müşahidə olunan qurbanlara görə"}
              </p>
              <ul className="space-y-1.5">
                {landscape.topActors.map((a) => (
                  <ActorRow key={(a.id ?? a.name) + a.victimCount} a={a} maxVictim={maxVictim} en={en} />
                ))}
              </ul>
            </>
          )}

          {(landscape.sectors.length > 0 || landscape.topCves.length > 0) && (
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
              {landscape.sectors.length > 0 && (
                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    {en ? "Most-targeted sectors" : "Ən çox hədəf alınan sektorlar"}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {landscape.sectors.slice(0, 10).map((sec) => (
                      <li
                        key={sec.name}
                        className="flex items-center gap-1.5 border border-hairline bg-surface-raised px-2 py-1 font-mono text-[12px] text-ink-secondary"
                        style={{ borderRadius: "var(--radius-chip)" }}
                      >
                        <span className="uppercase tracking-wide">{sec.name}</span>
                        <span className="tabular-nums text-ink-muted">{nf(sec.count)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {landscape.topCves.length > 0 && (
                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    {en ? "Recurring CVEs" : "Təkrarlanan CVE-lər"}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {landscape.topCves.slice(0, 8).map((c) => (
                      <li key={c.cve} className="flex items-center gap-2 font-mono text-[13px]">
                        <Link href={`/cve/${c.cve}`} className="text-ink-secondary transition-colors hover:text-brand">
                          {c.cve}
                        </Link>
                        {c.kev && (
                          <span className="rounded-sm border border-accent-critical/40 px-1 text-[10px] uppercase tracking-wide text-accent-critical">
                            KEV
                          </span>
                        )}
                        {c.cwe && <span className="text-[11px] text-ink-muted">{c.cwe}</span>}
                        <span className="ml-auto tabular-nums text-ink-muted">×{nf(c.count)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* (4) defender priorities — numbered ledger (à la ActorPlaybook) */}
        {priorities.items.length > 0 && (
          <section data-sc className="mt-16">
            <div className="flex items-baseline gap-3">
              <h2 className="font-headline text-xl text-brand">
                {en ? "Defender priorities" : "Müdafiə prioritetləri"}
              </h2>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[11px] text-ink-muted">{priorities.items.length}</span>
            </div>
            <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-secondary">
              {en
                ? "The most-seen attack types in the archive, ranked, each with concrete steps drawn only from canonical mitigation records — nothing invented."
                : "Arxivdə ən çox rast gəlinən hücum növləri — sıralanmış, hər biri yalnız kanonik mitigation qeydlərindən götürülmüş konkret addımlarla; heç nə uydurulmayıb."}
            </p>

            <ol className="mt-5 space-y-3">
              {priorities.items.map((p, i) => (
                <PriorityRow key={p.attackType + i} p={p} idx={i} en={en} />
              ))}
            </ol>
          </section>
        )}

        {/* honesty footer — grounded in the archive; no economics, no providers */}
        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          {en
            ? `Every figure is drawn straight from the skopnix archive${
                landscape.totalItems ? ` — ${nf(landscape.totalItems)} curated items` : ""
              }${period.months ? ` over ${period.months} months` : ""}. ${
                priorities.totalMitigations
                  ? `Defensive steps are selected from ${priorities.totalMitigations} canonical mitigation records; nothing is invented.`
                  : "Nothing is invented."
              }${period.generatedAt ? ` Updated ${fmtDate(period.generatedAt, true)}.` : ""} Part of skopnix — global cyber-threat intelligence.`
            : `Bütün rəqəmlər birbaşa skopnix arxivindən götürülüb${
                landscape.totalItems ? ` — ${nf(landscape.totalItems)} kurasiya olunmuş hadisə` : ""
              }${period.months ? `, ${period.months} ay üzrə` : ""}. ${
                priorities.totalMitigations
                  ? `Müdafiə addımları ${priorities.totalMitigations} kanonik mitigation qeydindən seçilib; heç nə uydurulmayıb.`
                  : "Heç nə uydurulmayıb."
              }${period.generatedAt ? ` Yenilənmə: ${fmtDate(period.generatedAt, false)}.` : ""} skopnix-nin bir hissəsi — Azərbaycan kiber-təhlükə kəşfiyyatı.`}
        </p>
      </main>
      <Footer />
    </div>
  );
}

// One actor line: name (linked to its dossier when resolvable), type, a victim-share
// bar, and the observed victim count. An unresolved actor is plain text — never a
// dead dossier link.
function ActorRow({ a, maxVictim, en }: { a: TopActor; maxVictim: number; en: boolean }) {
  const isNation = a.type === "nation-state";
  const pct = Math.max(2, Math.round((a.victimCount / maxVictim) * 100));
  const name = (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={isNation ? "text-[10px] text-accent-critical/70" : "text-[10px] text-brand"}>
        ▸
      </span>
      <span className="truncate font-medium">{a.name}</span>
    </span>
  );
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-x-3 gap-y-1 border-b border-hairline py-2 last:border-b-0 sm:grid-cols-[14rem_minmax(0,1fr)_4.5rem]">
      <div className="min-w-0 text-[14px] text-ink-primary">
        {a.slug ? (
          <Link href={`/actors/${a.slug}`} className="group block truncate transition-colors hover:text-brand" title={a.name}>
            {name}
          </Link>
        ) : (
          <span className="block truncate text-ink-secondary" title={a.name}>
            {name}
          </span>
        )}
      </div>
      <span className="hidden h-2 bg-brand-wash sm:block" style={{ borderRadius: "var(--radius-chip)" }}>
        <span
          className="block h-full bg-brand"
          style={{ width: `${pct}%`, borderRadius: "var(--radius-chip)" }}
        />
      </span>
      <span className="text-right font-mono text-[13px] tabular-nums text-ink-secondary">
        {nf(a.victimCount)}
        <span className="ml-1 text-[10px] text-ink-muted">{en ? "vic" : "qb"}</span>
      </span>
    </li>
  );
}

// One priority: number + attack-type headline + incident count, then the grounded
// mitigation steps. Mirrors ActorPlaybook's numbered-ledger shape.
function PriorityRow({ p, idx, en }: { p: Priority; idx: number; en: boolean }) {
  const actions = en
    ? p.actionsEn.length
      ? p.actionsEn
      : p.actionsAz
    : p.actionsAz.length
      ? p.actionsAz
      : p.actionsEn;
  return (
    <li
      className="border border-hairline border-l-2 border-l-brand/60 bg-surface-raised p-4"
      style={{ borderRadius: "var(--radius-chip)" }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] font-bold text-brand">{String(idx + 1).padStart(2, "0")}</span>
        <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-ink-primary">{p.attackType}</h3>
        <span className="ml-auto font-mono text-[11px] text-ink-muted">
          {nf(p.incidentCount)} {en ? "incidents" : "hadisə"}
        </span>
      </div>
      {actions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {actions.map((act, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-secondary">
              <span aria-hidden className="mt-[3px] text-[10px] text-brand">▸</span>
              <span>{act}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
