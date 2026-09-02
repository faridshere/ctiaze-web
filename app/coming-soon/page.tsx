import type { Metadata } from "next";
import { GodEyeGlobe } from "@/components/GodEyeGlobe";
import { Waitlist } from "@/components/Waitlist";

// The ctiaze.tech placeholder. That domain is retired as a product surface — the
// whole site now lives on skopnix.com — so everything ctiaze.tech serves is this
// one screen: the globe, and a section to drop an email.
//
// It is reached ONLY through the host rewrite in next.config.ts, never linked
// from skopnix.com. Reads nothing from the database, so it renders fully static
// and costs nothing per visit.
export const dynamic = "force-static";

export const metadata: Metadata = {
  // absolute: the root layout appends "— skopnix", which does not belong on a
  // retired domain that is not the product.
  title: { absolute: "Something is coming" },
  description: "Drop your email to hear first.",
  // Never index this: it is a placeholder on a retired domain, and indexing it
  // would compete with skopnix.com for the same words.
  robots: { index: false, follow: false },
};

const STREAKS: React.CSSProperties[] = [
  { width: 1600, height: 330, left: -220, top: 40, background: "linear-gradient(100deg, transparent 5%, rgba(38,90,150,0.5) 30%, rgba(111,211,230,0.46) 52%, rgba(38,70,140,0.32) 72%, transparent 95%)" },
  { width: 1500, height: 210, left: -120, top: 240, background: "linear-gradient(100deg, transparent 8%, rgba(111,211,230,0.38) 40%, rgba(150,200,235,0.3) 60%, transparent 92%)" },
  { width: 1300, height: 170, left: 200, top: -70, background: "linear-gradient(100deg, transparent, rgba(60,60,140,0.36) 45%, rgba(111,150,230,0.26) 65%, transparent)" },
  { width: 1200, height: 150, left: 60, top: 400, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.14) 45%, rgba(255,140,80,0.09) 62%, transparent)" },
];

export default function ComingSoonPage() {
  return (
    <main className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#05060a]">
      <div aria-hidden className="absolute inset-0 opacity-80">
        <GodEyeGlobe />
      </div>
      {STREAKS.map((st, i) => (
        <div
          key={i}
          aria-hidden
          className="aurora-streak pointer-events-none absolute rounded-full"
          style={{ ...st, filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: `${i * -3.2}s` }}
        />
      ))}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(85% 65% at 50% 45%, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.36) 55%, transparent 82%)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[40rem] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-[clamp(2.2rem,6vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-[#EDF1F6]">
          Something is coming.
        </h1>
        <p data-sc className="mt-5 max-w-[26rem] text-[length:var(--t-body)] leading-relaxed text-[#9AA6B4]">
          Drop your email and you&apos;ll hear first.
        </p>
        <div data-sc="2" className="mt-8 w-full max-w-md">
          <Waitlist source="ctiaze-landing" compact />
        </div>
      </div>
    </main>
  );
}
