import type { Metadata } from "next";
import { CtiazeMark } from "@/components/CtiazeMark";
import { SITE_TAGLINE, SITE_URL } from "@/lib/site";

// The ctiaze.tech placeholder. That domain is retired as a product surface — the
// whole site now lives on skopnix.com — so everything ctiaze.tech serves is this
// one screen: a nameplate card on the paper, the logo, one line, and the link
// to skopnix.com. No globe, no aurora, no form: a retired domain should point at
// the paper, not compete with it.
//
// It is reached ONLY through the host rewrite in next.config.ts, never linked
// from skopnix.com. Reads nothing from the database, so it renders fully static
// and costs nothing per visit.
export const dynamic = "force-static";

export const metadata: Metadata = {
  // absolute: the root layout appends "— skopnix", which does not belong on a
  // retired domain that is not the product.
  title: { absolute: "ctiaze is now skopnix" },
  description: `ctiaze.tech has moved. ${SITE_TAGLINE} Read it at skopnix.com.`,
  // Never index this: it is a placeholder on a retired domain, and indexing it
  // would compete with skopnix.com for the same words.
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="flex min-h-[100svh] flex-col bg-paper text-ink">
      <div className="sheet flex flex-1 items-center justify-center py-12">
        <div className="double-box w-full max-w-[34rem] p-[3px]">
          <div className="px-6 py-10 text-center sm:px-10 sm:py-14">
            <p className="label text-ink-3">Notice · ctiaze.tech</p>
            <div className="rule-2 mx-auto mt-5 w-16" />
            <a href={SITE_URL} className="mt-8 inline-flex items-center gap-3 text-ink" aria-label="skopnix — the front page">
              <CtiazeMark className="size-9 text-ink sm:size-10" />
              <span className="font-wordmark text-[2rem] font-bold tracking-[-0.02em] sm:text-[2.4rem]">
                skop<span className="text-brand">nix</span>
              </span>
            </a>
            <p className="mt-5 text-[16px] leading-relaxed text-ink-2">{SITE_TAGLINE}</p>
            <div className="rule-soft mt-8" />
            <p className="mt-6">
              <a
                href={SITE_URL}
                className="label inline-flex h-11 items-center justify-center gap-2 bg-ink px-5 text-paper transition-colors hover:bg-ink-2"
              >
                Read it at skopnix.com <span aria-hidden className="font-mono text-[1.1em] leading-none">→</span>
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
