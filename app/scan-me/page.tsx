import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScanMe } from "@/components/ScanMe";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 0;

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/scan-me", dil, en,
    azTitle: "Özünü yoxla — breach və domain exposure · Scan me",
    enTitle: "Scan me — breach & domain exposure check",
    azDesc: "E-poçt, parol və iş domeninin ifşasını yoxla. Breach axtarışı (XposedOrNot), pwned-parol yoxlaması (k-anonymity), subdomain-lar (certspotter) və Shodan hücum səthi.",
    enDesc: "Check your email, password and work domain exposure. Breach lookup (XposedOrNot), pwned-password check (k-anonymity), subdomains (certspotter) and Shodan attack surface.",
  });
}

export default async function ScanMePage() {
  const locale = await getLocale();
  const t = getDict(locale).scan;

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">{t.eyebrow}</p>
        <h1 className="mt-3 text-balance font-headline text-3xl text-ink-primary sm:text-4xl">{t.h1}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          {t.leadPre}
          <span className="text-ink-primary">{t.leadMid}</span>
          {t.leadEnd}
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-sm border border-hairline bg-surface-raised/40 px-3 py-1.5 text-[13px] text-ink-secondary">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
          </span>
          <span>
            <b className="text-ink-primary">{t.pledgeBold}</b>
            {t.pledgeRest}
          </span>
        </p>

        <div className="mt-8">
          <ScanMe locale={locale} />
        </div>

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          {t.sources}
        </p>
      </main>
      <Footer />
    </div>
  );
}
