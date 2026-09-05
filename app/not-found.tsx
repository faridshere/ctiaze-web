import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { Panel } from "@/components/site/Panel";
import { Button } from "@/components/site/Button";
import { Waitlist } from "@/components/Waitlist";

// A 404 is a high-intent moment: someone followed a skopnix link — an old post,
// a mistyped slug, a shelved section that slipped the redirect list. Rather than
// dead-end them, recover the lead with the email form. Deliberately NO database
// read here: bots spray random paths, and every 404 must stay free (no Mongo
// hit, no ISR write) — so this is fully static and the only interactive part is
// the client-side Waitlist.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHead narrow kicker="404" title="That link's gone — you're not.">
          <p className="mt-6 max-w-[34rem] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            The page moved or never existed. The wire hasn&apos;t — drop your email and you&apos;ll get the
            threats that matter, straight from the source.
          </p>
          <Panel className="mt-8 max-w-md px-6 py-6">
            <Waitlist source="404" />
          </Panel>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/" variant="ghost" size="sm">
              Home
            </Button>
            <Button href="/news" variant="ghost" size="sm">
              Archive
            </Button>
          </div>
        </PageHead>
      </main>
      <SiteFooter />
    </>
  );
}
