import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { Button } from "@/components/site/Button";

// A 404 is a high-intent moment: someone followed a skopnix link — an old post,
// a mistyped slug, a shelved section that slipped the redirect list. Rather than
// dead-end them, point at what is still there, the stack check first. (The
// email form for alerts that did not exist was removed on 2026-10-17.)
// Deliberately NO database read here: bots spray random paths, and every 404
// must stay free (no Mongo hit, no ISR write), so this is fully static.
const WAYS = [
  { href: "/stack", label: "Stack check" },
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
