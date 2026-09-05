import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { CtaBand } from "@/components/site/CtaBand";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

const ABOUT_SENTENCE =
  "skopnix reads the world's cyber threats and files them where you can actually read them. Quietly, continuously — no noise, nothing invented.";

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
  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHead narrow kicker="About" title="skopnix">
          <p className="mt-6 max-w-[36rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
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
        <div className="mt-[var(--sp-section)]">
          <CtaBand source="about" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
