import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CountUp } from "@/components/CountUp";
import { getAuditSummary, type AuditSummary } from "@/lib/audit";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 86400; // methodology is near-static; numbers via ISR

const BASE = "https://ctiaze.tech";

const nf = (n: number) => n.toLocaleString("en-US");

// The pipeline in plain language: sources → AI curation → grounded rewrite →
// groundedness audit → publish. Kept honest and consistent with /about; the
// audit step is the one this page makes visible.
const STEPS_AZ: [string, string][] = [
  ["Toplama", "~60 qlobal təhlükəsizlik mənbəyi hər 2 saatdan bir avtomatik oxunur."],
  ["Süzgəc", "Süni intellekt hər xəbərin Azərbaycan üçün əhəmiyyətini qiymətləndirir — gündəlik gurultunu kəsir, yalnız vacib olanı saxlayır."],
  ["Əsaslandırılmış tərcümə", "Seçilən məzmun peşəkar Azərbaycan dilinə çevrilir və qurulduğu mənbəyə bağlı qalır — CVE, RCE kimi texniki terminlər qorunur."],
  ["Əsaslandırma yoxlaması", "Müstəqil, avtomatik yoxlama hər izahı iddia-iddia mənbəyə qarşı ölçür. Bu səhifə məhz bu addımı görünən edir."],
  ["Dərc", "Nəticə @ctiaze Telegram kanalına və bu sayta göndərilir — 24/7, insan müdaxiləsi olmadan."],
];

const STEPS_EN: [string, string][] = [
  ["Collection", "~60 global security sources are read automatically every 2 hours."],
  ["Curation", "AI judges how much each story matters for Azerbaijan — cutting the daily noise, keeping only what counts."],
  ["Grounded rewrite", "The selected content is rewritten into professional Azerbaijani, tied to the source it was built from — technical terms like CVE, RCE are preserved."],
  ["Groundedness audit", "An independent, automated check measures every explainer, claim by claim, against its source. This page is what makes that step visible."],
  ["Publish", "The result goes to the @ctiaze Telegram channel and this site — 24/7, with no human in the loop."],
];

const TYPE_LABEL: Record<string, { az: string; en: string }> = {
  actor: { az: "təhdid aktoru", en: "threat actors" },
  malware: { az: "zərərli proqram", en: "malware families" },
  guide: { az: "anlayış izahı", en: "concept explainers" },
};

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/methodology", dil, en,
    azTitle: "Metodologiya — necə yoxlayırıq",
    enTitle: "Methodology — how we verify",
    azDesc:
      "skopnix necə işləyir və özünü necə yoxlayır: hər izah qurulduğu mənbələrə qarşı müstəqil əsaslandırma yoxlamasından keçir — sərt yoxlama, açıq nəticə. Heç nə gizlədilmir.",
    enDesc:
      "How skopnix works and how it checks itself: every explainer is independently audited, claim by claim, against the sources it was built from — a strict check, kept on the record. Nothing hidden.",
  });
}

type StatTile = { value: number; suffix?: string; az: string; en: string };

export default async function MetodologiyaPage() {
  const en = (await getLocale()) === "en";
  const summary = await getAuditSummary();
  const steps = en ? STEPS_EN : STEPS_AZ;

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: en ? "Methodology — how we verify" : "Metodologiya — necə yoxlayırıq",
    description: en
      ? "How skopnix works and how it checks itself: every explainer is independently audited, claim by claim, against its sources."
      : "skopnix necə işləyir və özünü necə yoxlayır: hər izah müstəqil şəkildə, iddia-iddia, mənbələrə qarşı yoxlanılır.",
    inLanguage: en ? "en" : "az",
    url: `${BASE}/methodology`,
    mainEntityOfPage: `${BASE}/methodology`,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: "skopnix", url: BASE },
    publisher: { "@type": "Organization", name: "skopnix", url: BASE },
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(article) }} />

        {/* headline */}
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.24em] text-brand">
          <span aria-hidden className="h-px w-5 bg-brand" />
          {en ? "Methodology" : "Metodologiya"}
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl font-bold uppercase text-ink-primary sm:text-4xl">
          {en ? "How we verify" : "Necə yoxlayırıq"}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          {en
            ? "skopnix is autonomous — but not unaccountable. Global sources are collected, filtered, and rewritten into Azerbaijani by AI, then held to a standard most AI publishers never show you: every explainer is measured against its sources, and the result is kept on the record."
            : "skopnix avtonomdur — lakin hesabatsız deyil. Qlobal mənbələr toplanır, süzülür və süni intellektlə Azərbaycan dilinə çevrilir; sonra isə əksər AI nəşrlərinin sizə heç vaxt göstərmədiyi bir standarta tabe olur: hər izah öz mənbələrinə qarşı ölçülür və nəticə açıq saxlanılır."}
        </p>

        {/* the pipeline */}
        <h2 className="mt-14 flex items-baseline gap-3 font-headline text-xl text-brand">
          {en ? "The pipeline" : "Pipeline"}
          <span aria-hidden className="h-px flex-1 bg-hairline" />
        </h2>
        <ol className="mt-6 space-y-4">
          {steps.map(([label, desc], i) => (
            <li key={label} data-sc={i > 2 ? "2" : undefined} className="flex gap-4">
              <span className="shrink-0 pt-1 font-mono text-xs tabular-nums text-ink-muted">
                0{i + 1}
              </span>
              <div>
                <div className="font-medium text-ink-primary">{label}</div>
                <div className="mt-0.5 text-[15px] leading-relaxed text-ink-secondary">{desc}</div>
              </div>
            </li>
          ))}
        </ol>

        {/* the groundedness audit — the visible moat */}
        <section data-sc className="mt-16">
          <h2 className="flex items-baseline gap-3 font-headline text-xl text-brand">
            {en ? "The groundedness audit" : "Əsaslandırma yoxlaması"}
            <span aria-hidden className="h-px flex-1 bg-hairline" />
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
            {en
              ? "Most AI publishers show you the output and stop there. skopnix runs a second, independent pass over everything it writes about threat actors, malware families and core concepts — measuring each explainer, claim by claim, against the sources it was built from."
              : "Əksər AI nəşrləri sizə yalnız nəticəni göstərir. skopnix isə təhdid aktorları, zərərli proqramlar və əsas anlayışlar haqqında yazdığı hər şeyi ikinci, müstəqil yoxlamadan keçirir — hər izahı, qurulduğu mənbələrə qarşı iddia-iddia ölçür."}
          </p>

          {summary ? (
            <AuditFigures summary={summary} en={en} />
          ) : (
            <p className="mt-6 max-w-2xl border-l-2 border-l-hairline pl-4 text-[14px] leading-relaxed text-ink-muted">
              {en
                ? "Live audit figures are momentarily unavailable — the check itself runs regardless, on every explainer."
                : "Canlı audit rəqəmləri hazırda əlçatan deyil — yoxlamanın özü isə hər izahda, dayanmadan işləyir."}
            </p>
          )}

          {/* what a flag means — so the flagged count is never misread as "wrong" */}
          <p className="mt-8 max-w-2xl border-l-2 border-l-brand/60 pl-4 text-[14px] leading-relaxed text-ink-secondary">
            {en
              ? "The audit is deliberately strict. It flags any statement that reaches beyond what the source explicitly says — even a fact documented widely elsewhere. A flag therefore marks where the text leans on general knowledge, not necessarily an error. Every flagged statement is logged with the exact claim and the reason."
              : "Yoxlama qəsdən sərtdir. Mənbənin açıq şəkildə demədiyi hər ifadəni — başqa yerlərdə geniş sənədləşdirilmiş faktı belə — işarələyir. Deməli, işarə mətnin ümumi biliyə söykəndiyi yeri göstərir, mütləq səhvi yox. İşarələnmiş hər ifadə dəqiq iddiası və səbəbi ilə birlikdə qeydə alınır."}
          </p>

          {/* the honest promise — transparency, not a perfection score */}
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-primary">
            {en
              ? "We keep that record — the clean and the flagged alike — instead of hiding it. That is the whole point: a check you can't see is a check you have to take on faith. Nothing here is invented from nothing, and nothing is presented as source-backed that the audit hasn't measured."
              : "Biz həmin qeydi — həm təmiz, həm işarələnmiş — gizlətmək əvəzinə saxlayırıq. Bütün məsələ də budur: görə bilmədiyiniz yoxlamaya yalnız inam qalır. Burada heç nə yoxdan uydurulmur və audit ölçmədiyi heç nə mənbəyə əsaslanan kimi təqdim edilmir."}
          </p>

          {/* scope across the knowledge base */}
          {summary && summary.byType.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                {en ? "Audited across the knowledge base" : "Bilik bazası üzrə yoxlanılıb"}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {summary.byType.map((t) => (
                  <li
                    key={t.type}
                    className="flex items-center gap-1.5 border border-hairline bg-surface-raised px-2.5 py-1 font-mono text-[12px] text-ink-secondary"
                    style={{ borderRadius: "var(--radius-chip)" }}
                  >
                    <span className="tabular-nums text-ink-primary">{nf(t.audited)}</span>
                    <span className="uppercase tracking-wide">
                      {(TYPE_LABEL[t.type] ?? { az: t.type, en: t.type })[en ? "en" : "az"]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* see also */}
        <div className="mt-14 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px]">
          <Link href="/about" className="text-brand hover:underline">
            {en ? "About skopnix →" : "Haqqında →"}
          </Link>
          <Link href="/situation" className="text-brand hover:underline">
            {en ? "Threat situation →" : "Vəziyyət →"}
          </Link>
          <a href="https://t.me/ctiaze" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            @ctiaze →
          </a>
        </div>

        {/* honesty footer */}
        <p className="mt-10 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          {summary
            ? en
              ? `Every number on this page is read straight from skopnix's own audit log — ${nf(summary.audited)} explainers checked, ${nf(summary.flaggedClaims)} statements flagged — not a marketing figure. Part of skopnix — global cyber-threat intelligence.`
              : `Bu səhifədəki hər rəqəm birbaşa skopnix-nin öz audit qeydindən oxunur — ${nf(summary.audited)} izah yoxlanılıb, ${nf(summary.flaggedClaims)} ifadə işarələnib — marketinq göstəricisi deyil. skopnix-nin bir hissəsi — Azərbaycan kiber-təhlükə kəşfiyyatı.`
            : en
              ? "Every number on this page is read straight from skopnix's own audit log — never a marketing figure. Part of skopnix — global cyber-threat intelligence."
              : "Bu səhifədəki hər rəqəm birbaşa skopnix-nin öz audit qeydindən oxunur — heç vaxt marketinq göstəricisi deyil. skopnix-nin bir hissəsi — Azərbaycan kiber-təhlükə kəşfiyyatı."}
        </p>
      </main>
      <Footer />
    </div>
  );
}

// Stat band — the honest aggregates, animated like /situation. Only figures the
// content_audit collection provably supports: how much was audited, coverage, and
// how many statements were flagged as reaching beyond source. Deliberately NO
// "% verified" / accuracy score, which the data does not support.
function AuditFigures({ summary, en }: { summary: AuditSummary; en: boolean }) {
  const tiles: StatTile[] = [
    { value: summary.audited, az: "yoxlanılmış izah", en: "explainers audited" },
  ];
  if (summary.coveragePct !== null) {
    tiles.push({
      value: summary.coveragePct,
      suffix: "%",
      az: "bilik bazası əhatə olunub",
      en: "of the knowledge base",
    });
  }
  tiles.push({
    value: summary.flaggedClaims,
    az: "mənbədən kənar ifadə, qeydə alınıb",
    en: "statements flagged as beyond-source",
  });

  return (
    <dl
      className={`mt-8 grid grid-cols-1 divide-y divide-hairline border-y border-hairline sm:divide-x sm:divide-y-0 ${
        tiles.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
      }`}
    >
      {tiles.map((t, i) => (
        <div
          key={t.en}
          data-sc={i > 0 ? "2" : undefined}
          className="flex flex-col px-0 py-4 sm:px-5 sm:py-5 sm:first:pl-0"
        >
          <dt className="order-2 mt-1 font-mono text-[length:var(--t-micro)] uppercase tracking-widest text-ink-muted">
            {en ? t.en : t.az}
          </dt>
          <dd className="order-1 font-headline text-2xl font-bold text-ink-primary sm:text-[1.75rem]">
            <CountUp value={t.value} />
            {t.suffix}
          </dd>
        </div>
      ))}
    </dl>
  );
}
