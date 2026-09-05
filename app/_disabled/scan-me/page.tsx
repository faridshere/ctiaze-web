import type { Metadata } from "next";
import { Header } from "@/components/_disabled/Header";
import { Footer } from "@/components/_disabled/Footer";
import { ScanMe } from "@/components/_disabled/ScanMe";
import { Waitlist } from "@/components/Waitlist";
import { WaitlistModal } from "@/components/_disabled/WaitlistModal";
import { getDict } from "@/lib/_disabled/i18n";
import { getLocale } from "@/lib/_disabled/i18n-server";
import { localizedMeta } from "@/lib/_disabled/seo";


export async function generateMetadata(
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/scan-me", en,
    azTitle: "Özünü yoxla — breach və domain exposure · Scan me",
    enTitle: "Scan me — breach & domain exposure check",
    azDesc: "E-poçt, parol və iş domeninin ifşasını yoxla. Breach axtarışı (XposedOrNot), pwned-parol yoxlaması (k-anonymity), subdomain-lar (certspotter) və Shodan hücum səthi.",
    enDesc: "Check your email, password and work-domain exposure — breaches, leaked passwords, exposed subdomains and internet-facing attack surface.",
  });
}

export default async function ScanMePage() {
  const locale = await getLocale();
  const t = getDict(locale).scan;

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <WaitlistModal source="scan-me" />
      {/* Core-register header: the same aurora world as home and /actors. */}
      <section className="relative isolate overflow-hidden border-b border-hairline bg-[#05060a]">
        <div aria-hidden className="aurora-streak pointer-events-none absolute rounded-full" style={{ width: 1400, height: 240, left: -220, top: -60, background: "linear-gradient(100deg, transparent 6%, rgba(38,90,150,0.4) 32%, rgba(111,211,230,0.32) 55%, transparent 92%)", filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen" }} />
        <div aria-hidden className="aurora-streak pointer-events-none absolute rounded-full" style={{ width: 1000, height: 140, right: -160, top: 110, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.10) 45%, rgba(111,211,230,0.14) 68%, transparent)", filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: "-6s" }} />
        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-10 pt-14 text-center sm:pb-12 sm:pt-20">
          <h1 className="mx-auto max-w-2xl text-balance font-display text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink-primary">{t.h1}</h1>
          <p data-sc className="mx-auto mt-5 max-w-xl leading-relaxed text-ink-secondary">
            {t.leadPre}
            <span className="text-ink-primary">{t.leadMid}</span>
            {t.leadEnd}
          </p>
        </div>
      </section>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="flex items-center gap-2.5 font-mono text-[12px] text-ink-secondary">
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

        <div className="mt-16 border-t border-hairline pt-12">
          <Waitlist source="scan-me:inline" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
