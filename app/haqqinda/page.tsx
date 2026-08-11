import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getStats } from "@/lib/stories";
import { getLocale } from "@/lib/i18n-server";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Haqqında · About",
  description:
    "How ctiaze works — ~60 global cybersecurity sources auto-collected, AI-filtered, fact-checked against source, and translated into Azerbaijani, 24/7 with no human in the loop.",
};

const STEPS_AZ: [string, string][] = [
  ["Toplama", "~60 qlobal təhlükəsizlik mənbəyi (NVD, CISA KEV, ransomware.live, aparıcı security bloqları) hər 2 saatdan bir avtomatik oxunur."],
  ["Relevance", "Süni intellekt (Claude) hər xəbərin Azərbaycan üçün əhəmiyyətini qiymətləndirir — gündəlik gurultunu kəsir, yalnız vacib olanı saxlayır."],
  ["Grounding (anti-hallucination)", "Determinist yoxlama hər iddianı orijinal mənbə ilə tutuşdurur — model uydursa, xəbər saxlanılır. Hər başlıqdakı «əsaslandırılıb ✓» budur."],
  ["Tərcümə", "Yoxlanmış xəbər Claude ilə peşəkar Azərbaycan dilinə çevrilir — CVE, RCE kimi texniki terminlər qorunur, tərcümə də mənbəyə qarşı yoxlanılır."],
  ["Signal gate", "Yalnız real CVE, canlı IOC və ya təcili regional təhlükə dərc olunur — qalanı saxlanılır, kanal siqnalla dolu qalır."],
  ["Dərc", "Nəticə eyni anda @ctiaze Telegram kanalına və bu sayta göndərilir. İnsan müdaxiləsi yoxdur — 24/7 avtonom."],
];

const STEPS_EN: [string, string][] = [
  ["Collection", "~60 global security sources (NVD, CISA KEV, ransomware.live, leading security blogs) are read automatically every 2 hours."],
  ["Relevance", "AI (Claude) judges how much each story matters for Azerbaijan — cutting the daily noise, keeping only what counts."],
  ["Grounding (anti-hallucination)", "A deterministic check compares every claim against the original source — if the model invents, the story is held. That's the «grounded ✓» on every headline."],
  ["Translation", "The verified story is rewritten into professional Azerbaijani with Claude — technical terms like CVE, RCE are preserved, and the translation is checked against source too."],
  ["Signal gate", "Only real CVEs, live IOCs or urgent regional threats are published — the rest is held, so the channel stays full of signal."],
  ["Publish", "The result goes to the @ctiaze Telegram channel and this site at once. No human in the loop — 24/7 autonomous."],
];

export default async function AboutPage() {
  const en = (await getLocale()) === "en";
  const stats = await getStats();
  const steps = en ? STEPS_EN : STEPS_AZ;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1 mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
        <h1 className="font-headline text-3xl sm:text-4xl text-ink-primary">
          {en ? "About" : "Haqqında"}
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-ink-secondary">
          <span className="text-ink-primary">ctiaze</span>
          {en
            ? " is an autonomous Azerbaijani-language cyber threat-intelligence (CTI) service. It collects news from ~60 global sources, picks what matters, fact-checks it against source, and translates it into Azerbaijani — 24/7, with no human in the loop."
            : " — Azərbaycan dilində avtomatlaşdırılmış kiber-təhlükə kəşfiyyatı (CTI) xidmətidir. Təxminən 60 qlobal mənbədən xəbərləri toplayır, əhəmiyyətli olanları seçir, mənbəyə qarşı yoxlayır və Azərbaycan dilinə tərcümə edir — 24/7, insan müdaxiləsi olmadan."}
        </p>

        <h2 className="mt-12 font-mono text-xs uppercase tracking-[0.18em] text-brand">
          {en ? "How it works" : "Necə işləyir"}
        </h2>
        <ol className="mt-5 space-y-4">
          {steps.map(([label, desc], i) => (
            <li key={label} className="flex gap-4">
              <span className="shrink-0 font-mono text-xs text-ink-muted pt-1 tabular-nums">
                0{i + 1}
              </span>
              <div>
                <div className="font-medium text-ink-primary">{label}</div>
                <div className="mt-0.5 text-[15px] leading-relaxed text-ink-secondary">
                  {desc}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 font-mono text-xs uppercase tracking-[0.18em] text-brand">
          {en ? "Who" : "Kim"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">
          <span className="text-ink-primary">Hackxana</span>
          {en ? " project — built and run by Farid Isgandarli. The pipeline is built on " : " layihəsi — Farid İsgəndərli tərəfindən qurulub və işlədilir. Pipeline "}
          <span className="text-ink-primary">Anthropic Claude</span>
          {en
            ? ". The goal: deliver global threat intelligence to Azerbaijan's security community in their native language — fast and verified."
            : " üzərində qurulub. Məqsəd: qlobal təhlükə kəşfiyyatını Azərbaycan security icmasına doğma dildə, sürətli və yoxlanmış şəkildə çatdırmaq."}
        </p>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px]">
          <a href="https://t.me/ctiaze" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">@ctiaze →</a>
          <Link href="/feed.json" className="text-brand hover:underline">feed.json</Link>
          <Link href="/rss.xml" className="text-brand hover:underline">RSS</Link>
          <a href="https://ctiaze.dev" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">ctiaze.dev (API/MCP)</a>
        </div>

        <p className="mt-10 pt-8 border-t border-hairline font-mono text-xs text-ink-muted">
          {en
            ? `${stats.total} dispatches so far · ${stats.kevCount} actively exploited (KEV)`
            : `indiyədək ${stats.total} dispaç · ${stats.kevCount} aktiv istismar (KEV)`}
        </p>
      </main>
      <Footer />
    </div>
  );
}
