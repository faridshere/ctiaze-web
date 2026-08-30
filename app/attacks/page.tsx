import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getGuides } from "@/lib/guides";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 86400; // reference content — grounded guides change rarely

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ dil?: string }>;
}): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/attacks",
    dil,
    en,
    azTitle: "Hücum növləri — necə işləyir və necə qorunmaq",
    enTitle: "Attack types explained (Azerbaijani + English)",
    azDesc:
      "Kiberhücum növlərinin sadə Azərbaycan dilində izahı: phishing, ransomware, SQL injection, DDoS, RCE və daha çox — hər biri üçün necə işləyir və qorunma addımları.",
    enDesc:
      "Cyber-attack types explained in Azerbaijani and English: phishing, ransomware, SQL injection, DDoS, RCE and more — how each works and step-by-step defenses.",
  });
}

export default async function HucumIndexPage() {
  const en = (await getLocale()) === "en";
  const guides = await getGuides();

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
        <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.24em] text-brand">
          <span aria-hidden className="h-px w-5 bg-brand" />
          {en ? "Attack types" : "Hücum növləri"}
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl font-bold uppercase text-ink-primary sm:text-4xl">
          {en
            ? "Attack types — how they work, how to defend"
            : "Hücum növləri — necə işləyir, necə qorunmaq"}
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {en
            ? `${guides.length} attack types explained plainly, in Azerbaijani and English — each with how it works, real examples, and a defense checklist.`
            : `${guides.length} hücum növü — sadə dildə, Azərbaycan və İngilis dilində. Hər biri üçün: necə işləyir, real nümunələr və qorunma addımları.`}
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => {
            const c = en ? g.en : g.az;
            return (
              <li key={g.slug}>
                <Link
                  href={`/attacks/${g.slug}`}
                  className="sweepable group flex h-full flex-col border border-hairline bg-surface-raised p-4 transition-colors hover:border-brand/50"
                  style={{ borderRadius: "var(--radius-chip)" }}
                >
                  <span className="flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wide text-ink-primary group-hover:text-brand">
                    <span
                      aria-hidden
                      className="text-[10px] text-brand transition-transform group-hover:translate-x-0.5"
                    >
                      ▸
                    </span>
                    {g.attackType}
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-secondary line-clamp-3">
                    {c.what}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-12 border-t border-hairline pt-6 font-mono text-[11px] leading-relaxed text-ink-muted">
          {en
            ? `${guides.length} guides · part of skopnix — global cyber-threat intelligence.`
            : `${guides.length} bələdçi · skopnix-nin bir hissəsi — Azərbaycan kiber-təhlükə kəşfiyyatı.`}
        </p>
      </main>
      <Footer />
    </div>
  );
}
