import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AttackRose } from "@/components/AttackRose";
import { CountUp } from "@/components/CountUp";
import { getAptAtlas } from "@/lib/apt";
import { actorInitials, flagEmoji } from "@/lib/threatactors";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 3600;

const BASE = "https://ctiaze.tech";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ dil?: string }>;
}): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/apt",
    dil,
    en,
    azTitle: "APT Atlas — dövlət dəstəkli qruplar",
    enTitle: "APT Atlas — nation-state threat groups",
    azDesc:
      "Dövlət dəstəkli APT qruplarının geosiyasi xəritəsi — kim hansı ölkədən fəaliyyət göstərir və kimi hədəf alır. Çin, İran, Rusiya və digər mənşə ölkələri üzrə qruplaşdırılıb (MITRE ATT&CK).",
    enDesc:
      "A geopolitical map of nation-state APT groups — who operates from which country and who they hit. Grouped by origin (China, Iran, Russia and more), with their MITRE ATT&CK techniques.",
  });
}

export default async function AptAtlasPage() {
  const locale = await getLocale();
  const en = locale === "en";
  const atlas = await getAptAtlas();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: en
      ? "APT Atlas — nation-state threat groups by origin country"
      : "APT Atlas — dövlət dəstəkli qruplar mənşə ölkəsinə görə",
    about: { "@type": "Thing", name: "Nation-state APT threat actors" },
    description: (en
      ? "Nation-state APT groups grouped by the origin country attributed to them, with the MITRE ATT&CK techniques each is known to use."
      : "Dövlət dəstəkli APT qrupları onlara aid edilən mənşə ölkəsinə görə qruplaşdırılıb, hər birinin işlətdiyi MITRE ATT&CK texnikaları ilə."
    ).slice(0, 300),
    inLanguage: en ? "en" : "az",
    isPartOf: { "@type": "WebSite", name: "ctiaze", url: BASE },
    url: `${BASE}/apt`,
  };

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
        />

        {/* (1) eyebrow + headline + one-line intro */}
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.24em] text-brand">
          <span aria-hidden className="h-px w-5 bg-brand" />
          APT ATLAS
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl font-bold text-ink-primary sm:text-4xl">
          {en
            ? "Which countries do APT groups operate from?"
            : "APT qrupları hansı ölkələrdən idarə olunur?"}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {en
            ? "A geopolitical map of the state-sponsored threat groups — grouped by the origin country attributed to them, so you can see who operates from where and who they hit. Each group links straight to its full dossier."
            : "Dövlət dəstəkli təhdid qruplarının geosiyasi xəritəsi — onlara aid edilən mənşə ölkəsinə görə qruplaşdırılıb ki, kimin haradan fəaliyyət göstərdiyini və kimi hədəf aldığını görəsən. Hər qrup öz tam dosyesinə aparır."}
        </p>

        {atlas.countries.length > 0 ? (
          <>
            {/* (2) stat band — honest CountUp figures */}
            <dl className="mt-10 grid grid-cols-2 divide-x divide-hairline border-y border-hairline">
              <div className="flex flex-col py-4 pl-4 first:pl-0 sm:py-5">
                <dt className="order-2 mt-1 font-mono text-[length:var(--t-micro)] uppercase tracking-widest text-ink-muted">
                  {en ? "nation-state groups" : "dövlət dəstəkli qrup"}
                </dt>
                <dd className="order-1 font-headline text-2xl font-bold text-ink-primary sm:text-[1.75rem]">
                  <CountUp value={atlas.totalActors} />
                </dd>
              </div>
              <div className="flex flex-col py-4 pl-4 first:pl-0 sm:py-5">
                <dt className="order-2 mt-1 font-mono text-[length:var(--t-micro)] uppercase tracking-widest text-ink-muted">
                  {en ? "origin countries" : "mənşə ölkəsi"}
                </dt>
                <dd className="order-1 font-headline text-2xl font-bold text-ink-primary sm:text-[1.75rem]">
                  <CountUp value={atlas.countryCount} />
                </dd>
              </div>
            </dl>

            {/* (3) per origin-country sections, biggest origins first */}
            {atlas.countries.map((c) => {
              const name = en ? c.name_en : c.name_az;
              const flag = flagEmoji(c.country_code);
              const hidden = c.actorCount - c.actors.length;
              return (
                <section key={c.country_code} data-sc className="mt-14">
                  <div className="flex items-baseline gap-3">
                    <h2 className="flex items-center gap-2.5 font-headline text-xl font-semibold text-ink-primary">
                      {flag && (
                        <span aria-hidden className="text-2xl leading-none">
                          {flag}
                        </span>
                      )}
                      {name}
                    </h2>
                    <span aria-hidden className="h-px flex-1 bg-hairline" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                      {c.actorCount} {en ? "groups" : "qrup"}
                    </span>
                  </div>

                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {c.actors.map((a) => {
                      const hasTech = a.techniques.length > 0;
                      const tagline = en ? a.tagline.en || a.tagline.az : a.tagline.az || a.tagline.en;
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
                              {tagline && (
                                <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-secondary line-clamp-2">
                                  {tagline}
                                </span>
                              )}
                              <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                                {hasTech
                                  ? `${a.techniques.length} ${en ? "ATT&CK techniques" : "ATT&CK texnika"}`
                                  : a.targetCount > 0
                                    ? en
                                      ? `${a.targetCount} target countries`
                                      : `${a.targetCount} hədəf ölkə`
                                    : en
                                      ? "nation-state"
                                      : "dövlət dəstəkli"}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  {c.capped && hidden > 0 && (
                    <p className="mt-3 font-mono text-[11px] text-ink-muted">
                      <Link href="/actors" className="transition-colors hover:text-brand">
                        {en
                          ? `+${hidden} more ${name} groups in the full roster →`
                          : `+${hidden} ${name} qrupu daha — tam siyahıda →`}
                      </Link>
                    </p>
                  )}
                </section>
              );
            })}
          </>
        ) : (
          <p className="mt-10 text-sm text-ink-muted">
            {en
              ? "The APT atlas is being prepared."
              : "APT atlası hazırlanır."}
          </p>
        )}

        {/* (4) honesty footer — provenance only, no economics/providers/models */}
        <p className="mt-16 border-t border-hairline pt-8 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? "Built from the threat archive: nation-state groups grouped by the origin country attributed to them and the MITRE ATT&CK techniques each is known to use (MISP Galaxy, MITRE ATT&CK). Attribution reflects the public sources — it is not a legal determination, and nothing here is invented."
            : "Təhdid arxivindən qurulub: dövlət dəstəkli qruplar onlara aid edilən mənşə ölkəsinə görə qruplaşdırılıb və hər birinin işlətdiyi MITRE ATT&CK texnikaları göstərilib (MISP Galaxy, MITRE ATT&CK). Atribusiya açıq mənbələrə əsaslanır — hüquqi qərar deyil və heç nə uydurulmayıb."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
