import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { StackCheck } from "@/components/stack/StackCheck";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Stack check — which of your products are exploited in the wild",
  description:
    "Paste your products and versions or upload a CycloneDX or SPDX SBOM. Get the CVEs that hit them, CISA KEV status, EPSS, and the threat actors cited as exploiting each, with the quote and the report. No signup.",
  alternates: { canonical: absoluteUrl("/stack") },
};

// Static shell; the check itself runs in the browser against /api/v1/stack.
export default function StackPage() {
  return (
    <>
      <SiteHeader section="Stack check · free · no signup" />
      <main id="main">
        <PageHead
          kicker="Stack check"
          title="Is your stack exploited right now?"
          meta={
            <>
              <span>CISA KEV · NVD ranges · FIRST EPSS</span>
              <span>actors cited with source</span>
            </>
          }
        >
          <p className="deck mt-5 max-w-[64ch] text-ink-2">
            List what you run. For each product and version you get the CVEs that hit it, whether CISA lists them as
            exploited in the wild, the odds of exploitation, and who is cited as exploiting them, quoted from the report
            that says so. Each finding says how sure the match is.
          </p>
        </PageHead>
        <section className="sheet pb-16 pt-8">
          <StackCheck />
          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
            API:{" "}
            <a href="/api/v1/stack" className="ulink hover:text-ink">
              POST /api/v1/stack
            </a>{" "}
            · JSON · no key · 500 components per check
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
