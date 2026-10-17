import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CtaBand } from "@/components/site/CtaBand";
import { absoluteUrl, SAME_AS, SITE_NAME, SITE_URL, SOURCE_COUNT } from "@/lib/site";
import { jsonLdSafe } from "@/lib/format";

export const revalidate = 3600;

// A plain "X is a Y" opener, deliberately. Google's AI Overview was answering
// "skopnix" with "probably a misspelling of Skopx or Scopix" — it had no sentence
// anywhere on the site that said what skopnix actually IS, only what it does.
const DEFINITION =
  "skopnix is a cyber threat intelligence (CTI) service. It watches international " +
  "security reporting and exploitation data around the clock, checks every item " +
  "against its original source, and publishes it as a free, continuously updated " +
  "global threat wire.";

// Metadata / social description only — the page itself leads with DEFINITION
// and nothing else. Two sentences was the brief.
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
    a: `From ${SOURCE_COUNT} watched sources — including NVD, CISA's Known Exploited Vulnerabilities catalogue, ` +
       "ransomware.live, MITRE ATT&CK, and vendor and independent security research. Every story links " +
       "to the original report; skopnix aggregates and verifies, it does not author the reporting.",
  },
  {
    q: "Is skopnix free?",
    a: "Yes. The threat wire, the archive and the adversary dossiers are free to read, and the RSS and " +
       "JSON feeds need no API key. Neither do the JSON API (/api/v1/items and /api/v1/actors) and the " +
       "per-actor STIX 2.1 bundles. An MCP server is in development.",
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
//
// The named byline was removed on 2026-09-14 at the owner's request. It had been
// added on 09-07 because five reviewers independently called the anonymity the
// site's biggest trust problem; that tradeoff is now deliberate, and the
// accountability claim below is written so it stands WITHOUT a personal name —
// "the method is published" is a checkable promise, "trust me" is not.
//
// v4: the three facts are set as a .cells strip. The one real figure (the
// source count) is set in mono; the other two cells are claims, so they carry
// a label and a line of running text, not a number dressed up as one.
const FACTS: { figure: string | null; word: string | null; label: string; line: string }[] = [
  { figure: String(SOURCE_COUNT), word: null, label: "sources watched", line: "Counted in the pipeline's source registry." },
  { figure: null, word: "Every dispatch.", label: "grounded to the original source", line: "Each one links the report that broke it." },
  { figure: null, word: "@skopnix", label: "published to Telegram and this site", line: "Plus the RSS and JSON feeds and the API." },
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
      <SiteHeader section="About this paper" />
      <main id="main">
        {/* The head, set locally: the section line in the strip already names the
            page, so no kicker here — a headline, then the 2px rule. */}
        <header className="sheet max-w-[52rem] pt-8 sm:pt-12">
          <h1 className="headline text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] text-ink">A wire you can check.</h1>
          <div className="rule-2 mt-6" />
        </header>

        {/* The running text: 17px/1.55 with a drop cap, the measure of an
            article column. The definition sentence leads; nothing above it. */}
        <article className="sheet max-w-[52rem] pt-8 sm:pt-10">
          <p className="prose-paper text-ink">{DEFINITION}</p>

          <dl className="cells mt-10 grid-cols-1 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.label} className="flex flex-col gap-2 py-4 sm:pr-4 sm:pl-4 sm:first:pl-0">
                <dt className="label text-ink-3">{f.label}</dt>
                <dd>
                  {f.figure ? (
                    <span className="num block font-mono text-[1.75rem] leading-none text-ink">{f.figure}</span>
                  ) : (
                    <span className="block font-body text-[1.75rem] font-semibold leading-none tracking-[-0.01em] text-ink">{f.word}</span>
                  )}
                  <span className="mt-2 block text-[12.5px] leading-snug text-ink-3">{f.line}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="rule-soft" />

          {/* Who is behind it — stated as a method rather than a person, since the
              byline came out on 2026-09-14. The trust signal a reader can act on is
              that every claim is checkable, not who is making it. */}
          <section className="mt-[var(--sp-section)]" aria-labelledby="about-method">
            <div className="rule-2" />
            <div className="grid gap-6 pt-5 md:grid-cols-[11rem_1fr]">
              <h2 id="about-method" className="label text-ink">
                How this is written
              </h2>
              <div>
                <p className="headline text-[clamp(1.4rem,2.6vw,1.9rem)] text-ink">Independent, and built by practitioners.</p>
                <p className="mt-3 text-[15px] leading-snug text-ink-3">Detection engineering, in the Caucasus and Central Asia.</p>
                <p className="prose-paper mt-5">
                  skopnix exists because the reporting a defender needs was scattered across sixty sites,
                  and almost none of it said whether the thing was actually being exploited. Everything
                  here links back to the original report, because you should check the work rather than
                  take it on trust.
                </p>
                <p className="prose-paper mt-4">
                  The pipeline is automated and no human reviews each item before it publishes — that is the point, it is
                  how the wire stays minutes behind the source instead of days. What is not automated is the
                  standard: an actor is only tied to a CVE when a named vendor or CERT report says so, and the source
                  is printed next to the claim so you can check it yourself.
                </p>
              </div>
            </div>
          </section>

          {/* Rendered, not just in JSON-LD: structured data has to describe content
              the reader can actually see, and these are the questions people ask. */}
          <section className="mt-[var(--sp-section)]" aria-labelledby="about-faq">
            <div className="rule-2" />
            <div className="grid gap-6 pt-5 md:grid-cols-[11rem_1fr]">
              <h2 id="about-faq" className="label text-ink">
                Common questions
              </h2>
              <dl className="divide-y divide-rule-soft">
                {FAQ.map((f) => (
                  <div key={f.q} className="py-5 first:pt-0">
                    <dt className="font-display text-[1.2rem] font-bold leading-tight text-ink">{f.q}</dt>
                    <dd className="prose-paper mt-2 text-[16px]">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </article>

        <div className="mt-[var(--sp-section)]">
          <CtaBand source="about" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
