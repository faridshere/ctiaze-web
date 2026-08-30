import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SectorPicker } from "@/components/SectorPicker";
import { getSectors } from "@/lib/sectors";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 86400;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ dil?: string }>;
}): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/sectors",
    dil,
    en,
    azTitle: "Sənin sektorunu kim hədəf alır? — sektor kəşfiyyatı",
    enTitle: "Who targets your sector? — sector threat intel",
    azDesc:
      "Azərbaycan bank, dövlət və energetika SOC-ları üçün: hansı APT və cinayət qrupları sənin sektorunu hədəf alır, hansı texnikaları işlədir və ilk növbədə nəyi düzəltməlisən.",
    enDesc:
      "For Azerbaijani bank, government and energy SOCs: which APT and crime groups target your sector, the techniques they use most, and what to fix first.",
  });
}

export default async function SectorsIndex() {
  const en = (await getLocale()) === "en";
  const sectors = await getSectors();

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20"
      >
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.24em] text-brand">
          <span aria-hidden className="h-px w-5 bg-brand" />
          {en ? "Sectors" : "Sektorlar"}
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl font-bold text-ink-primary sm:text-4xl">
          {en
            ? "Which groups target your sector?"
            : "Hansı qruplar sənin sektorunu hədəf alır?"}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {en
            ? "Pick your sector to see the groups that target it, the ATT&CK techniques they use most, and what to fix first — every hub is grounded in the threat archive."
            : "Sektorunu seç — onu hədəf alan qrupları, ən çox işlətdikləri ATT&CK texnikalarını və ilk növbədə nəyi düzəltməli olduğunu gör. Hər səhifə təhdid arxivinə əsaslanır."}
        </p>

        {sectors.length > 0 ? (
          <SectorPicker
            sectors={sectors.map((s) => ({ slug: s.slug, name_az: s.name_az, name_en: s.name_en }))}
            en={en}
          />
        ) : null}

        {sectors.length > 0 ? (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/sectors/${s.slug}`}
                  className="sweepable group block h-full border border-hairline bg-surface-raised p-4 transition-colors hover:border-brand/50"
                  style={{ borderRadius: "var(--radius-chip)" }}
                >
                  <span className="flex items-center gap-2 font-headline text-lg font-semibold text-ink-primary group-hover:text-brand">
                    <span
                      aria-hidden
                      className="text-[11px] text-brand transition-transform group-hover:translate-x-0.5"
                    >
                      ▸
                    </span>
                    {en ? s.name_en : s.name_az}
                  </span>
                  {s.actorCount > 0 && (
                    <span className="mt-2 block font-mono text-[12px] text-ink-secondary">
                      {en
                        ? `${s.actorCount} groups target this sector`
                        : `${s.actorCount} qrup bu sektoru hədəf alır`}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-sm text-ink-muted">
            {en
              ? "Sector intelligence is being prepared."
              : "Sektor kəşfiyyatı hazırlanır."}
          </p>
        )}

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? "Each hub is built from the threat archive — actor targeting, MITRE ATT&CK techniques and defensive guidance (MISP Galaxy, MITRE ATT&CK, ransomware.live). Nothing is invented."
            : "Hər səhifə təhdid arxivindən qurulur — aktor hədəfləməsi, MITRE ATT&CK texnikaları və müdafiə tövsiyələri (MISP Galaxy, MITRE ATT&CK, ransomware.live). Heç nə uydurulmayıb."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
