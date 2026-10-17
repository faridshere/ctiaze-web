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
//
// v4: the two sentences stay; under them the same facts as a ruled ledger
// (what · why · kept for), so a reader can check the prose against the rows.
const LEDGER: { what: string; why: string; kept: string }[] = [
  { what: "Email address, with the IP address and rough location it came from", why: "One email when alerts open", kept: "Until you ask" },
  { what: "A visit: the page, the same IP address and rough location", why: "Knowing which pages are read", kept: "30 days, then deleted" },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader section="Notices · Privacy" />
      <main id="main">
        <PageHead narrow kicker="Privacy" title="What we collect" />
        <article className="sheet max-w-[52rem] pt-8 sm:pt-10">
          <p className="prose-paper dropcap text-ink">
            If you give us an email address we store it — with the IP address and rough location (country and city)
            it came from — to tell you once when email alerts open. A visit records the page, the same IP address and
            rough location, and deletes itself after 30 days. Nothing is sold, shared or tracked across other sites.
          </p>
          <p className="prose-paper mt-4">
            Nothing here touches your infrastructure; ask on Telegram and your address is deleted, no form and no
            argument.
          </p>

          <div className="mt-10">
            <table className="w-full border-collapse">
              <caption className="sr-only">What is stored, why, and for how long</caption>
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="label pb-2 pr-4 text-left text-ink-3">Stored</th>
                  <th scope="col" className="label pb-2 pr-4 text-left text-ink-3">Why</th>
                  <th scope="col" className="label pb-2 text-left text-ink-3">Kept for</th>
                </tr>
              </thead>
              <tbody>
                {LEDGER.map((r) => (
                  <tr key={r.what} className="border-b border-rule-soft align-top">
                    <th scope="row" className="py-3 pr-4 text-left text-[14px] font-normal leading-snug text-ink">{r.what}</th>
                    <td className="py-3 pr-4 text-[14px] leading-snug text-ink-2">{r.why}</td>
                    <td className="num py-3 font-mono text-[12px] leading-snug text-ink-3">{r.kept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rule-2 mt-[var(--sp-section)]" />
          <div className="grid gap-4 pt-5 md:grid-cols-[11rem_1fr]">
            <p className="label text-ink">Questions, deletions</p>
            <p className="text-[14px] text-ink-2">
              <a href={LINKS.telegram} className="ulink text-ink" target="_blank" rel="noopener noreferrer">
                t.me/skopnix ↗
              </a>
              <span className="text-ink-3"> · no published mailbox: skopnix.com has no MX record, so mail to it cannot be delivered.</span>
            </p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
