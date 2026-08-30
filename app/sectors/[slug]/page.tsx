import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AttackRose } from "@/components/AttackRose";
import { getSector } from "@/lib/sectors";
import { actorInitials, flagEmoji, originLabel } from "@/lib/threatactors";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 86400;

const BASE = "https://ctiaze.tech";

export const dynamicParams = true;

// Render on-demand (ISR) instead of prerendering every page at build — the
// per-page Mongo aggregation is slow and was timing the build out (>60s/page).
// Any slug still generates on first request and caches (revalidate above).
export async function generateStaticParams() {
  return [];
}

// T1566.001 → attack.mitre.org/techniques/T1566/001 (same mapping as ActorPlaybook).
function techUrl(id: string): string {
  const [base, sub] = id.split(".");
  return `https://attack.mitre.org/techniques/${base}${sub ? `/${sub}` : ""}`;
}

// Actor-type chip — same register as ActorDossier so cards read consistently.
const TYPE_CHIP: Record<string, string> = {
  "nation-state":
    "border-accent-critical/40 bg-accent-critical/10 text-accent-critical",
  crime: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  unknown: "border-hairline bg-surface text-ink-muted",
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dil?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSector(slug);
  // Real 404 for an unknown sector slug (not a 200 soft-404 crawlers would index).
  if (!s) notFound();
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  const who = en ? s.who.en || s.who.az : s.who.az || s.who.en;
  return localizedMeta({
    path: `/sectors/${s.slug}`,
    dil,
    en,
    azTitle: `${s.name_az} sektoru: təhdidlər və müdafiə`,
    enTitle: `${s.name_en} sector: threats & defenses`,
    azDesc: (
      who ||
      `${s.name_az} sektorunu hədəf alan təhdid qrupları və müdafiə tövsiyələri.`
    ).slice(0, 160),
    enDesc: (
      who || `Threat groups targeting the ${s.name_en} sector and how to defend.`
    ).slice(0, 160),
  });
}

export default async function SectorHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = await getSector(slug);
  if (!s) notFound();
  const locale = await getLocale();
  const en = locale === "en";

  const name = en ? s.name_en : s.name_az;
  const who = en ? s.who.en || s.who.az : s.who.az || s.who.en;
  const ttps = en ? s.ttps.en || s.ttps.az : s.ttps.az || s.ttps.en;
  const defense = en
    ? s.defense.en.length
      ? s.defense.en
      : s.defense.az
    : s.defense.az.length
      ? s.defense.az
      : s.defense.en;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: en
      ? `${name} sector: threats & defenses`
      : `${name} sektoru: təhdidlər və müdafiə`,
    about: { "@type": "Thing", name: `${name} sector` },
    description: (who || "").slice(0, 300),
    inLanguage: en ? "en" : "az",
    isPartOf: { "@type": "WebSite", name: "skopnix", url: BASE },
    url: `${BASE}/sectors/${s.slug}`,
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
        />

        <nav className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link href="/sectors" className="hover:text-brand">
            {en ? "Sectors" : "Sektorlar"}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-secondary">{name}</span>
        </nav>

        {/* (1) headline + who-targets-you */}
        <h1 className="mt-3 font-headline text-3xl font-bold text-ink-primary sm:text-4xl">
          {en ? `${name} sector` : `${name} sektoru`}
        </h1>
        {s.actorCount > 0 && (
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.14em] text-brand">
            {en
              ? `${s.actorCount} groups observed targeting this sector`
              : `${s.actorCount} qrup bu sektoru hədəf alır`}
          </p>
        )}
        {who && (
          <p className="mt-6 max-w-[62ch] text-[15px] leading-relaxed text-ink-secondary">
            {who}
          </p>
        )}

        {/* (2) groups targeting you — linked actor cards */}
        {s.actors.length > 0 && (
          <section data-sc className="mt-12">
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
              {en ? "Groups targeting you" : "Səni hədəf alan qruplar"}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              <span className="font-normal text-ink-muted">
                {s.actors.length}
              </span>
            </h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {s.actors.map((a) => {
                const origin = originLabel(a, locale);
                const flag = flagEmoji(a.origin_country);
                const hasTech = (a.techniques?.length ?? 0) > 0;
                const typeLabel =
                  a.type === "unknown"
                    ? en
                      ? "unknown"
                      : "naməlum"
                    : a.type;
                return (
                  <li key={a._id}>
                    <Link
                      href={`/actors/${a._id}`}
                      className="sweepable group flex h-full items-start gap-3 border border-hairline bg-surface-raised p-4 transition-colors hover:border-brand/50"
                      style={{ borderRadius: "var(--radius-chip)" }}
                    >
                      {hasTech ? (
                        <AttackRose
                          actor={a}
                          className="size-16 shrink-0"
                          title={
                            en
                              ? `${a.name} — ATT&CK techniques`
                              : `${a.name} — ATT&CK texnikaları`
                          }
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="grid size-16 shrink-0 place-items-center rounded-sm border border-hairline bg-surface font-mono text-sm font-semibold text-ink-secondary"
                        >
                          {actorInitials(a.name)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-headline text-base font-semibold text-ink-primary group-hover:text-brand">
                          {a.name}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-muted">
                          <span
                            className={`rounded-full border px-1.5 py-0.5 uppercase tracking-wider ${
                              TYPE_CHIP[a.type] ?? TYPE_CHIP.unknown
                            }`}
                          >
                            {typeLabel}
                          </span>
                          {origin && (
                            <span>
                              {flag && <span aria-hidden>{flag} </span>}
                              {origin}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* (3) most-used techniques */}
        {(ttps || s.techniques.length > 0) && (
          <section data-sc className="mt-12">
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
              {en
                ? "Most-used techniques"
                : "Ən çox istifadə olunan texnikalar"}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              {s.techniques.length > 0 && (
                <span className="font-normal text-ink-muted">
                  {s.techniques.length}
                </span>
              )}
            </h2>
            {ttps && (
              <p className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">
                {ttps}
              </p>
            )}
            {s.techniques.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {s.techniques.map((t) => (
                  <li key={t.id}>
                    <a
                      href={techUrl(t.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${t.id}${t.name ? ` · ${t.name}` : ""}`}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-primary transition-colors hover:border-brand hover:text-brand"
                    >
                      <span className="font-mono text-[10px] text-ink-muted">
                        {t.id}
                      </span>
                      {t.name || t.id}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* (4) defense — numbered ledger (mirrors ActorPlaybook) */}
        {defense.length > 0 && (
          <section data-sc className="mt-12">
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
              {en ? "Defense" : "Müdafiə"}
              <span aria-hidden className="h-px flex-1 bg-hairline" />
              <span className="font-normal text-ink-muted">{defense.length}</span>
            </h2>
            <ol className="mt-4 space-y-3">
              {defense.map((d, i) => (
                <li
                  key={d}
                  className="flex gap-3 border border-hairline border-l-2 border-l-brand/60 bg-surface-raised p-4"
                  style={{ borderRadius: "var(--radius-chip)" }}
                >
                  <span className="font-mono text-[11px] font-bold text-brand">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[14px] leading-relaxed text-ink-secondary">
                    {d}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* (5) honesty footer — user-value provenance only */}
        <p className="mt-14 border-t border-hairline pt-8 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? "Built from the threat archive: which groups target this sector and the MITRE ATT&CK techniques they use (MISP Galaxy, MITRE ATT&CK, ransomware.live). Guidance is general and grounded in the sources — not a substitute for a tailored risk assessment."
            : "Təhdid arxivindən qurulub: bu sektoru hansı qrupların hədəf aldığı və işlətdikləri MITRE ATT&CK texnikaları (MISP Galaxy, MITRE ATT&CK, ransomware.live). Tövsiyələr ümumidir və mənbələrə əsaslanır — fərdi risk qiymətləndirməsini əvəz etmir."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
