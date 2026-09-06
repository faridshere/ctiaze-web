import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { absoluteUrl, LINKS } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy",
  description: "What skopnix collects, why, how long it is kept, and how to have it deleted.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

// Written because the site asks for an email address in three places and had no
// privacy policy at all — the first thing a non-technical reader looks for before
// letting anyone in their company near a tool. Everything below describes what the
// code actually does (app/api/waitlist, app/api/hit, lib/signup); if the code
// changes, change this with it.
const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "If you give us your email",
    p: [
      "It is stored so we can tell you once when early access opens. Alongside it we keep the page you signed up from, the date, and the country and city your IP resolves to — so we know where interest is coming from.",
      "It is never sold, rented, shared with advertisers, or added to a newsletter you did not ask for. There are no tracking pixels in anything we send.",
    ],
  },
  {
    h: "If you just read the site",
    p: [
      "A visit records the page, the referring site, your IP address, and the country and city it resolves to. Pages are served from a CDN and never reach our code, so this is the only way we can tell whether anyone is reading.",
      "These rows delete themselves after 30 days, automatically, by a database expiry rule — not by us remembering to do it.",
      "No advertising cookies, no third-party trackers, no cross-site profiling, no session recording, no fingerprinting.",
    ],
  },
  {
    h: "Who can see it",
    p: [
      "One person: the author of this site. Data sits in a MongoDB Atlas database and the site runs on Vercel; both can technically access what they host, as any hosting provider can.",
      "We will not hand data to anyone else except where the law actually requires it.",
    ],
  },
  {
    h: "Deleting it",
    p: [
      "Email hello@skopnix.com and say so. Your address is removed from the signup list. No account to close, no form, no retention argument.",
    ],
  },
  {
    h: "What we do not do",
    p: [
      "We do not scan you. We do not read your systems. Nothing on this site touches your infrastructure — it reads public reporting and public scan data and republishes it.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHead narrow kicker="Privacy" title="What we collect">
          <p className="mt-6 max-w-[38rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            Short version: an email address if you give us one, and a 30-day record of page visits. Nothing else, and
            nothing sold.
          </p>
        </PageHead>
        <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[46rem] px-5">
          <div className="divide-y divide-hairline border-y border-hairline">
            {SECTIONS.map((s) => (
              <div key={s.h} className="py-6">
                <h2 className="font-display text-[17px] font-semibold text-ink-primary">{s.h}</h2>
                {s.p.map((para, i) => (
                  <p key={i} className="mt-2 max-w-[40rem] text-[14px] leading-relaxed text-ink-secondary">
                    {para}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-8 font-mono text-[12px] text-ink-muted">
            Questions:{" "}
            <a href={LINKS.email} className="text-brand hover:underline">
              hello@skopnix.com
            </a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
