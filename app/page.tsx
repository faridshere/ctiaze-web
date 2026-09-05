import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AuroraField } from "@/components/site/AuroraField";
import { Kicker } from "@/components/site/Kicker";
import { CtaBand } from "@/components/site/CtaBand";
import { Waitlist } from "@/components/Waitlist";
import { WirePanel } from "@/components/home/WirePanel";
import { Pillars } from "@/components/home/Pillars";
import { StatGrid } from "@/components/home/StatGrid";
import { RelativeTime } from "@/components/home/RelativeTime";
import { jsonLdSafe } from "@/lib/format";
import { getHomeData, EMPTY_HOME_DATA } from "@/lib/home-data";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// The landing page. Its whole job is an email — everything else on it is
// evidence that the wire is real: the live panel, the fortnight of dispatches,
// the archive total, the weekly counts. Hourly ISR from one cached data blob;
// no per-visit invocation, no Mongo read on the request path.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — see it, nix it` },
  description: `${SITE_TAGLINE} Drop your email for free early access.`,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${SITE_NAME} — see it, nix it`,
    description: SITE_TAGLINE,
    url: SITE_URL,
    images: ["/opengraph-image"],
  },
};

function utcHHMM(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export default async function LandingPage() {
  // Never let the data layer take the landing page down: no data → quiet page.
  const data = await getHomeData().catch(() => EMPTY_HOME_DATA);
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    logo: `${SITE_URL}/icon.svg`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(orgLd) }} />
      <SiteHeader />
      <main id="main">
        {/* ---- hero: the ask, over the globe ---- */}
        <section className="relative isolate overflow-hidden bg-void">
          <AuroraField />
          {/* the globe dissolves into the page ground under the wire panel */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent to-surface" />
          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-[46rem] flex-col items-center justify-center px-6 pb-40 pt-20 text-center sm:pb-48">
            <Kicker live className="fade-up">
              {data.week.dispatches > 0
                ? `${data.week.dispatches.toLocaleString("en-US")} dispatches this week`
                : "live · around the clock"}
            </Kicker>
            <h1 className="mt-8 font-display text-[clamp(3rem,9vw,6.2rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-ink-primary">
              <span className="hl"><span>See it.</span></span>
              <span className="hl"><span>Nix it.</span></span>
            </h1>
            <p data-sc className="mt-6 max-w-[30rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
              {SITE_TAGLINE} Free early access to the API and MCP server when they open.
            </p>
            <div data-sc="2" className="mt-9 w-full max-w-md text-left">
              <Waitlist source="skopnix-landing" />
            </div>
            {data.latestAt && (
              <p data-sc="3" className="mt-8 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                last dispatch <RelativeTime iso={data.latestAt} /> · as of {utcHHMM(data.generatedAt)}
              </p>
            )}
          </div>
        </section>

        {/* ---- the seam: the wire panel rides over the hero's bottom edge ---- */}
        <div className="relative z-10 -mt-32 px-[var(--sp-gutter)] sm:-mt-36">
          <WirePanel rows={data.wire} total={data.total} />
        </div>

        {/* ---- pillars ---- */}
        <section className="mx-auto w-full max-w-[80rem] px-[var(--sp-gutter)] pt-[var(--sp-section)]">
          <div data-sc>
            <Kicker>What this is</Kicker>
            <h2 className="mt-5 max-w-[40rem] font-display text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink-primary">
              The world&apos;s threat reporting, read for you, filed where you can find it.
            </h2>
          </div>
          <div data-sc="2" className="mt-10">
            <Pillars data={data} />
          </div>
        </section>

        {/* ---- the numbers ---- */}
        <section className="mx-auto w-full max-w-[80rem] px-[var(--sp-gutter)] pt-[var(--sp-section)]">
          <div data-sc className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Kicker>Last seven days</Kicker>
              <h2 className="mt-5 max-w-[34rem] font-display text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-primary">
                Everything on the wire is grounded to its source. Nothing is invented.
              </h2>
            </div>
            <p className="max-w-[22rem] text-[14px] leading-relaxed text-ink-secondary">
              Counts over the same published-story gate the pipeline uses before a dispatch reaches Telegram. Refreshed hourly.
            </p>
          </div>
          <div data-sc="2">
            <StatGrid week={data.week} />
          </div>
        </section>

        {/* ---- the ask, again, for the reader who scrolled ---- */}
        <div className="pt-[var(--sp-section)]" data-sc>
          <CtaBand source="skopnix-landing:band" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
