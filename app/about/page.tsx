import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { CtaBand } from "@/components/site/CtaBand";
import { absoluteUrl, SAME_AS, SITE_NAME, SITE_URL } from "@/lib/site";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 3600;

// A plain "X is a Y" opener, deliberately. Google's AI Overview was answering
// "skopnix" with "probably a misspelling of Skopx or Scopix" — it had no sentence
// anywhere on the site that said what skopnix actually IS, only what it does.
const DEFINITION =
  "skopnix is a cyber threat intelligence (CTI) service. It watches international " +
  "security reporting, vulnerability feeds and exploitation data around the clock, " +
  "checks every item against the original source, and publishes it as a free, " +
  "continuously updated global threat wire.";

const ABOUT_SENTENCE =
  "skopnix reads the world's cyber threats and files them where you can actually read them. Quietly, continuously — no noise, nothing invented.";

// Answer-engine bait, but honest: every answer is a fact already true of the
// product, phrased as the question a person actually types.
const FAQ: { q: string; a: string }[] = [
  {
    q: "What is skopnix?",
    a: DEFINITION,
  },
  {
    q: "Where does skopnix get its data?",
    a: "From 66 watched sources — including NVD, CISA's Known Exploited Vulnerabilities catalogue, " +
       "ransomware.live, MITRE ATT&CK, and vendor and independent security research. Every story links " +
       "to the original report; skopnix aggregates and verifies, it does not author the reporting.",
  },
  {
    q: "Is skopnix free?",
    a: "Yes. The threat wire, the archive and the adversary dossiers are free to read, and the RSS and " +
       "JSON feeds need no API key. A developer API and MCP server are in development.",
  },
  {
    q: "What does skopnix mean?",
    a: "It is a coined name, from skopein — Greek for 'to look at, examine' — and nix, to get rid of " +
       "something. See it, nix it. It is not a variant of any other product name.",
  },
];

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_SENTENCE,
  alternates: { canonical: absoluteUrl("/about") },
};

// Three claims a reader can actually verify: the source count and the pipeline
// shape are documented in RUNBOOK.md, the outbound channel is the real
// @skopnix Telegram feed — nothing here is rounded up or invented for effect.
const FACTS = [
  "66 sources watched",
  "grounded to the original source",
  "published to Telegram @skopnix and this site",
];

export default function AboutPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: absoluteUrl("/about"),
    mainEntity: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      description: DEFINITION,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      sameAs: SAME_AS,
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(aboutLd) }} />
      <SiteHeader />
      <main id="main">
        <PageHead narrow kicker="About" title="skopnix">
          <p className="mt-6 max-w-[36rem] text-[length:var(--t-body)] leading-relaxed text-ink-primary">
            {DEFINITION}
          </p>
          <p className="mt-4 max-w-[36rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            {ABOUT_SENTENCE}
          </p>
          <ul className="mt-10 grid divide-y divide-hairline border-y border-hairline font-mono text-[12px] uppercase tracking-[0.12em] text-ink-secondary md:grid-cols-3 md:divide-x md:divide-y-0">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-2.5 py-3.5 md:px-4 md:first:pl-0">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-muted/60" />
                {f}
              </li>
            ))}
          </ul>
        </PageHead>
        {/* Rendered, not just in JSON-LD: structured data has to describe content
            the reader can actually see, and these are the questions people ask. */}
        <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[46rem] px-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-brand align-middle" />
            Common questions
          </h2>
          <dl className="mt-6 divide-y divide-hairline border-y border-hairline">
            {FAQ.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="font-display text-[17px] font-semibold text-ink-primary">{f.q}</dt>
                <dd className="mt-2 max-w-[40rem] text-[14px] leading-relaxed text-ink-secondary">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="mt-[var(--sp-section)]">
          <CtaBand source="about" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
