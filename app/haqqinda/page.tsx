import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getStats } from "@/lib/stories";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Haqqında",
  description:
    "ctiaze necə işləyir — təxminən 60 qlobal mənbədən avtomatik toplanan kibertəhlükəsizlik xəbərləri AI ilə süzülür, mənbəyə qarşı yoxlanılır və Azərbaycan dilinə tərcümə olunur.",
};

const STEPS: [string, string][] = [
  ["Toplama", "~60 qlobal təhlükəsizlik mənbəyi (NVD, CISA KEV, ransomware.live, aparıcı security bloqları) hər 2 saatdan bir avtomatik oxunur."],
  ["Relevance", "Süni intellekt (Claude) hər xəbərin Azərbaycan üçün əhəmiyyətini qiymətləndirir — gündəlik gurultunu kəsir, yalnız vacib olanı saxlayır."],
  ["Grounding (anti-hallucination)", "Determinist yoxlama hər iddianı orijinal mənbə ilə tutuşdurur — model uydursa, xəbər saxlanılır. Hər başlıqdakı «əsaslandırılıb ✓» budur."],
  ["Tərcümə", "Yoxlanmış xəbər Claude ilə peşəkar Azərbaycan dilinə çevrilir — CVE, RCE kimi texniki terminlər qorunur, tərcümə də mənbəyə qarşı yoxlanılır."],
  ["Signal gate", "Yalnız real CVE, canlı IOC və ya təcili regional təhlükə dərc olunur — qalanı saxlanılır, kanal siqnalla dolu qalır."],
  ["Dərc", "Nəticə eyni anda @ctiaze Telegram kanalına və bu sayta göndərilir. İnsan müdaxiləsi yoxdur — 24/7 avtonom."],
];

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
        <h1 className="font-headline text-3xl sm:text-4xl text-ink-primary">
          Haqqında
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-ink-secondary">
          <span className="text-ink-primary">ctiaze</span> — Azərbaycan dilində
          avtomatlaşdırılmış kiber-təhlükə kəşfiyyatı (CTI) xidmətidir. Təxminən 50
          qlobal mənbədən xəbərləri toplayır, əhəmiyyətli olanları seçir, mənbəyə
          qarşı yoxlayır və Azərbaycan dilinə tərcümə edir — 24/7, insan müdaxiləsi
          olmadan.
        </p>

        <h2 className="mt-12 font-mono text-xs uppercase tracking-[0.18em] text-brand">
          Necə işləyir
        </h2>
        <ol className="mt-5 space-y-4">
          {STEPS.map(([label, desc], i) => (
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
          Kim
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">
          <span className="text-ink-primary">Hackxana</span> layihəsi — Farid
          İsgəndərli tərəfindən qurulub və işlədilir. Pipeline{" "}
          <span className="text-ink-primary">Anthropic Claude</span> üzərində
          qurulub. Məqsəd: qlobal təhlükə kəşfiyyatını Azərbaycan security
          icmasına doğma dildə, sürətli və yoxlanmış şəkildə çatdırmaq.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px]">
          <a href="https://t.me/ctiaze" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">@ctiaze →</a>
          <Link href="/feed.json" className="text-brand hover:underline">feed.json</Link>
          <Link href="/rss.xml" className="text-brand hover:underline">RSS</Link>
          <a href="https://ctiaze.dev" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">ctiaze.dev (API/MCP)</a>
        </div>

        {/* quiet English foothold for international readers */}
        <div lang="en" className="mt-10 rounded-md border border-hairline bg-surface-raised/30 px-4 py-3.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">In English</div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-secondary">
            ctiaze is an autonomous Azerbaijani-language cyber threat-intelligence
            service. Every 2 hours it pulls ~60 global security sources; Claude
            judges what matters for Azerbaijan; a deterministic grounding step
            fact-checks every claim against its source before Claude rewrites it in
            Azerbaijani; and a signal gate publishes only real CVEs, live IOCs, and
            urgent regional threats — to the @ctiaze channel and this site, 24/7,
            with no human in the loop. Built by Farid Isgandarli (Hackxana) on
            Anthropic&apos;s Claude.
          </p>
        </div>

        <p className="mt-10 pt-8 border-t border-hairline font-mono text-xs text-ink-muted">
          indiyədək {stats.total} dispaç · {stats.kevCount} aktiv istismar (KEV)
        </p>
      </main>
      <Footer />
    </div>
  );
}
