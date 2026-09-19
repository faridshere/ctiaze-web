import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { absoluteUrl, LINKS } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy",
  description: "What skopnix collects, why, and how to have it deleted.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

// Deliberately two sentences. The long version said the same thing five times over
// and nobody read past the first block. Both sentences describe what the code
// actually does (app/api/waitlist, app/api/hit, lib/signup) — if that changes,
// change this with it.
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHead narrow kicker="Privacy" title="What we collect">
          <p className="mt-6 max-w-[38rem] text-[length:var(--t-body)] leading-relaxed text-ink-primary">
            If you give us an email address we store it — with the IP address and rough location (country and city)
            it came from — to tell you once when early access opens. A visit records the page, the same IP address and
            rough location, and deletes itself after 30 days. Nothing is sold, shared or tracked across other sites.
          </p>
          <p className="mt-4 max-w-[38rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            Nothing here touches your infrastructure; ask on Telegram and your address is deleted, no form and no
            argument.
          </p>
        </PageHead>
        <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[46rem] px-5">
          <p className="font-mono text-[12px] text-ink-muted">
            Questions:{" "}
            <a href={LINKS.telegram} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
              t.me/skopnix ↗
            </a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
