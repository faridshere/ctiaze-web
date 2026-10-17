import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { Button } from "@/components/site/Button";
import { Waitlist } from "@/components/Waitlist";

// A 404 is a high-intent moment: someone followed a skopnix link — an old post,
// a mistyped slug, a shelved section that slipped the redirect list. Rather than
// dead-end them, recover the lead with the email form. Deliberately NO database
// read here: bots spray random paths, and every 404 must stay free (no Mongo
// hit, no ISR write) — so this is fully static and the only interactive part is
// the client-side Waitlist.
const WAYS = [
  { href: "/", label: "The front page" },
  { href: "/news", label: "The archive" },
  { href: "/actors", label: "Adversaries" },
  { href: "/api-docs", label: "The API" },
];

export default function NotFound() {
  return (
    <>
      <SiteHeader section="Notice · Page not found" />
      <main id="main">
        <PageHead narrow kicker="404" title="That link's gone. The wire isn't." />
        <div className="sheet max-w-[52rem] pt-8 sm:pt-10">
          <p className="prose-paper">
            The page moved or never existed. Every dispatch, every dossier and every feed is still where it was.
          </p>

          <div className="double-box mt-8 max-w-[34rem] p-[3px]">
            <div className="p-5 sm:p-6">
              <p className="label text-ink">Email alerts are next</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">One email when they open. Nothing else, ever.</p>
              <div className="mt-4">
                <Waitlist source="404" />
              </div>
            </div>
          </div>

          <div className="rule-2 mt-10" />
          <p className="label mt-5 text-ink-3">Still where it was</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {WAYS.map((w) => (
              <Button key={w.href} href={w.href} variant="ghost" size="sm">
                {w.label}
              </Button>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
