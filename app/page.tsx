import type { Metadata } from "next";
import { FrontMasthead } from "@/components/site/Masthead";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Lead } from "@/components/home/Lead";
import { Wire } from "@/components/home/Wire";
import { IndexStrip } from "@/components/home/IndexStrip";
import { Standfirst } from "@/components/home/Standfirst";
import { Census } from "@/components/home/Census";
import { Roster } from "@/components/home/Roster";
import { Yesterday } from "@/components/home/Yesterday";
import { Classifieds } from "@/components/home/Classifieds";
import { WireLive } from "@/components/home/WireLive";
import { jsonLdSafe } from "@/lib/format";
import { getExposureCensus, EMPTY_CENSUS } from "@/lib/exposure";
import { getHomeData, EMPTY_HOME_DATA } from "@/lib/home-data";
import { getActorsPageData } from "@/lib/threatactors";
import { SAME_AS, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// The front page of the paper. The lead is the newest actively-exploited
// story, the wire runs beside it, and every number on the page is a count the
// engine made. Hourly ISR from cached blobs; no Mongo read on the request path.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — see it, nix it` },
  description: `${SITE_TAGLINE} Every exploited CVE, the adversaries behind it, and a free JSON API — refreshed around the clock.`,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${SITE_NAME} — see it, nix it`,
    description: SITE_TAGLINE,
    url: SITE_URL,
    images: ["/opengraph-image"],
  },
};

export default async function LandingPage() {
  // Never let the data layer take the front page down: no data, quiet page.
  const [data, census, actors] = await Promise.all([
    getHomeData().catch(() => EMPTY_HOME_DATA),
    getExposureCensus().catch(() => EMPTY_CENSUS),
    getActorsPageData().catch(() => null),
  ]);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "skopnix threat intelligence",
    url: SITE_URL,
    description:
      "skopnix is a cyber threat intelligence service. It reads international " +
      "security reporting, vulnerability and exploitation feeds around the clock, " +
      "verifies each item against its original source, and publishes it as a free " +
      "global threat wire with worldwide internet-exposure figures.",
    slogan: SITE_TAGLINE,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
    image: `${SITE_URL}/icon-512.png`,
    knowsAbout: [
      "cyber threat intelligence",
      "vulnerability management",
      "CISA Known Exploited Vulnerabilities",
      "ransomware",
      "threat actors",
      "internet exposure",
    ],
    sameAs: SAME_AS,
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "skopnix",
    url: SITE_URL,
    description: SITE_TAGLINE,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  const tapeRow = data.wire[0] ?? data.lead ?? null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(siteLd) }} />
      <FrontMasthead total={data.total} tapeRow={tapeRow} last24h={data.last24h} serverIso={data.generatedAt} />
      <main id="main">
        <WireLive />
        {/* ---- the front page: lead left, the wire right ---- */}
        <section className="sheet pt-8 sm:pt-10" aria-label="Front page">
          <div className="grid gap-10 md:grid-cols-12 md:gap-6">
            <div className="md:col-span-7 md:pr-6">
              {data.lead ? (
                <Lead lead={data.lead} />
              ) : (
                <div>
                  <h1 className="headline text-[clamp(2.5rem,6vw,5.5rem)] text-ink">
                    <span className="hl"><span>See it.</span></span>
                    <span className="hl"><span>Nix it.</span></span>
                  </h1>
                  <p className="deck mt-6 max-w-[48ch]">{SITE_TAGLINE}</p>
                </div>
              )}
            </div>
            <div className="md:col-span-5 md:row-span-2 md:border-l md:border-ink md:pl-6 lg:col-span-4 lg:col-start-9">
              <Wire rows={data.wire} total={data.total} />
            </div>
            <div className="md:col-span-7 md:pr-6">
              <IndexStrip week={data.week} daily={data.daily} />
            </div>
          </div>
        </section>

        <Standfirst data={data} />

        <Census rows={census.rows} measuredAt={census.measuredAt} previousAt={census.previousAt} />

        {actors && <Roster data={actors} />}

        <Yesterday rows={data.yesterday} dayKey={data.yesterdayKey} />

        <Classifieds />
      </main>
      <SiteFooter total={data.total} />
    </>
  );
}
