import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScanMe } from "@/components/ScanMe";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Özünü yoxla — breach və domain exposure",
  description:
    "E-poçt ünvanını və ya iş domain-ini yaz: hansı data breach-lərdə görünüb (XposedOrNot) və domain-in nə qədəri açıq internetdə görünür (certspotter + Shodan). False positive yoxdur — hər fakt mənbəsi ilə gəlir.",
};

export default function ScanMePage() {
  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
          Şəxsi exposure yoxlaması
        </p>
        <h1 className="mt-3 text-balance font-headline text-3xl text-ink-primary sm:text-4xl">
          Sən internetdə nə qədər açıqdasan?
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          E-poçt ünvanını və ya iş domain-ini yaz — sənə düz cavab verək: ünvanın hansı{" "}
          <span className="text-ink-primary">breach</span>-lərdə görünüb, və domain-inin nə qədəri açıq
          internetdə görünür. Heç nə uydurmuruq.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-sm border border-hairline bg-surface-raised/40 px-3 py-1.5 text-[13px] text-ink-secondary">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
          </span>
          <span>
            <b className="text-ink-primary">False positive yoxdur.</b> Hər fakt mənbəsi ilə gəlir;
            təsdiqləyə bilmədiyimizi <span className="font-mono text-ink-muted">unavailable</span> kimi göstəririk.
          </span>
        </p>

        <div className="mt-8">
          <ScanMe />
        </div>

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          Mənbələr: <span className="text-ink-secondary">XposedOrNot</span> (breach-analytics, keyless),{" "}
          <span className="text-ink-secondary">certspotter + crt.sh</span>,{" "}
          <span className="text-ink-secondary">Shodan InternetDB</span>,{" "}
          <span className="text-ink-secondary">ctiaze</span> coverage, və həftəlik{" "}
          <span className="text-ink-secondary">Shodan AZ</span> snapshot. Hamısı açarsız/pulsuz — e-poçt
          ünvanın heç yerdə saxlanmır.
        </p>
      </main>
      <Footer />
    </div>
  );
}
