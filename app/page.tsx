import type { Metadata } from "next";
import { GodEyeGlobe } from "@/components/GodEyeGlobe";
import { Waitlist } from "@/components/Waitlist";
import { CtiazeMark } from "@/components/CtiazeMark";
import { jsonLdSafe } from "@/lib/format";

// skopnix.com landing page. The product surfaces are shelved under app/_disabled
// while the project runs on free tiers; what remains is one screen whose whole
// job is collecting an email.
//
// It reads nothing from the database, so it renders fully static: served from
// the CDN, no serverless invocation, no ISR write, no Mongo read per visit.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "skopnix — see it, nix it" },
  description:
    "The world's cyber threats, read straight off the wire. Drop your email for free early access.",
  alternates: { canonical: "https://skopnix.com" },
  openGraph: {
    title: "skopnix — see it, nix it",
    description: "The world's cyber threats, read straight off the wire.",
    url: "https://skopnix.com",
    images: ["/opengraph-image"],
  },
};

const STREAKS: React.CSSProperties[] = [
  { width: 1600, height: 330, left: -220, top: 40, background: "linear-gradient(100deg, transparent 5%, rgba(38,90,150,0.5) 30%, rgba(111,211,230,0.46) 52%, rgba(38,70,140,0.32) 72%, transparent 95%)" },
  { width: 1500, height: 210, left: -120, top: 240, background: "linear-gradient(100deg, transparent 8%, rgba(111,211,230,0.38) 40%, rgba(150,200,235,0.3) 60%, transparent 92%)" },
  { width: 1300, height: 170, left: 200, top: -70, background: "linear-gradient(100deg, transparent, rgba(60,60,140,0.36) 45%, rgba(111,150,230,0.26) 65%, transparent)" },
  { width: 1200, height: 150, left: 60, top: 400, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.14) 45%, rgba(255,140,80,0.09) 62%, transparent)" },
];

export default function LandingPage() {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "skopnix",
    url: "https://skopnix.com",
    description: "The world's cyber threats, read straight off the wire.",
    logo: "https://skopnix.com/icon.svg",
  };

  return (
    <main className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#05060a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(orgLd) }} />

      <div aria-hidden className="absolute inset-0 opacity-75">
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
        style={{ background: "radial-gradient(90% 70% at 50% 42%, rgba(5,6,10,0.6) 0%, rgba(5,6,10,0.3) 55%, transparent 80%)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[46rem] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex items-center gap-2.5">
          <CtiazeMark className="size-[26px] text-[#EDF1F6]" />
          <span className="font-display text-xl font-semibold tracking-[-0.015em] text-[#EDF1F6]">
            skop<span className="text-brand">nix</span>
          </span>
        </div>

        <h1 className="mt-10 font-display text-[clamp(3rem,9vw,6rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-[#EDF1F6]">
          <span className="hl"><span>See it.</span></span>
          <span className="hl"><span>Nix it.</span></span>
        </h1>

        <p data-sc className="mt-6 max-w-[30rem] text-[length:var(--t-body)] leading-relaxed text-[#9AA6B4]">
          The world&apos;s cyber threats, read straight off the wire.
        </p>

        <div data-sc="2" className="mt-9 w-full max-w-md">
          <Waitlist source="skopnix-landing" compact />
        </div>
      </div>

      <footer className="relative z-10 pb-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#8d97a4]">
        <span style={{ textShadow: "0 1px 12px rgba(5,6,10,0.95), 0 0 4px rgba(5,6,10,0.9)" }}>
          © {new Date().getFullYear()} skopnix
        </span>
      </footer>
    </main>
  );
}
