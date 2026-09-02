import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StacknixTool } from "@/components/StacknixTool";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";


export async function generateMetadata(
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/stacknix", en,
    azTitle: "stacknix — steküninin CVE məruzqalması",
    enTitle: "stacknix — your stack's CVE exposure",
    azDesc: "İşlətdiyin məhsul + versiyanı yapışdır, uyğun CVE-ləri al: CISA KEV, FIRST EPSS, CVSS və sənin versiyanın həqiqətən zəif diapazonda olub-olmadığı.",
    enDesc: "Paste your product + version, get its matching CVEs: CISA KEV (exploited in the wild), FIRST EPSS, CVSS, and whether YOUR version is actually in the vulnerable range.",
  });
}

const STREAKS: React.CSSProperties[] = [
  { width: 1400, height: 240, left: -220, top: -60, background: "linear-gradient(100deg, transparent 6%, rgba(38,90,150,0.4) 32%, rgba(111,211,230,0.32) 55%, transparent 92%)" },
  { width: 1000, height: 140, right: -160, top: 120, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.10) 45%, rgba(111,211,230,0.14) 68%, transparent)" },
];

export default async function StacknixPage() {
  const locale = await getLocale();
  const en = locale === "en";
  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <section className="relative isolate overflow-hidden border-b border-hairline bg-[#05060a]">
        {STREAKS.map((st, i) => (
          <div key={i} aria-hidden className="aurora-streak pointer-events-none absolute rounded-full" style={{ ...st, filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: `${i * -6}s` }} />
        ))}
        <div className="relative z-10 mx-auto w-full max-w-[64rem] px-[var(--sp-gutter)] pb-8 pt-12 text-center sm:pb-10 sm:pt-16">
          <h1 className="mx-auto max-w-2xl text-balance font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink-primary">
            {en ? "Is your stack already exploitable?" : "Stekin artıq istismar oluna bilər?"}
          </h1>
          <p data-sc className="mx-auto mt-5 max-w-2xl leading-relaxed text-ink-secondary">
            {en
              ? "Tell us what your admins and developers actually run — product and version — and stacknix returns the CVEs that hit it: which are exploited in the wild per CISA KEV, EPSS odds, CVSS, and whether your exact version is inside the vulnerable range."
              : "Admin və developerlərinin işlətdiyini de — məhsul və versiya — stacknix isə ona dəyən CVE-ləri qaytarır: hansı CISA KEV üzrə vəhşidə istismar olunur, EPSS ehtimalı, CVSS və sənin versiyanın zəif diapazonda olub-olmadığı."}
          </p>
        </div>
      </section>
      <main id="main" className="pb-16">
        <StacknixTool en={en} />
      </main>
      <Footer />
    </div>
  );
}
