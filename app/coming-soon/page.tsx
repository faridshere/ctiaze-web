import type { Metadata } from "next";
import { AuroraField } from "@/components/site/AuroraField";
import { Waitlist } from "@/components/Waitlist";

// The ctiaze.tech placeholder. That domain is retired as a product surface — the
// whole site now lives on skopnix.com — so everything ctiaze.tech serves is this
// one screen: the globe, and a section to drop an email. Uses the shared
// AuroraField (the same hero recipe as the landing) instead of its own private
// streaks/globe markup.
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

export default function ComingSoonPage() {
  return (
    <main className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-void">
      <AuroraField
        globeOpacity={0.8}
        scrim="radial-gradient(85% 65% at 50% 45%, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.36) 55%, transparent 82%)"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[40rem] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-[clamp(2.2rem,6vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink-primary">
          Something is coming.
        </h1>
        <p data-sc className="mt-5 max-w-[26rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
          Drop your email and you&apos;ll hear first.
        </p>
        <div data-sc="2" className="mt-8 w-full max-w-md">
          <Waitlist source="ctiaze-landing" />
        </div>
      </div>
    </main>
  );
}
