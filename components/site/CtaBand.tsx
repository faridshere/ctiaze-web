import { LINKS } from "@/lib/site";
import { Button } from "./Button";

// The follow box at the foot of an inner page: a double-ruled classified with
// the three ways to follow that exist today (Telegram, RSS, the API) and the
// keyless stack check. Nothing here is promised: the email form for alerts
// that did not exist was removed on 2026-10-17. `id="access"` stays as the
// anchor older links point at.
export function FollowLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button href={LINKS.telegram} size="sm" glyph="↗">
        Follow on Telegram
      </Button>
      <Button href={LINKS.kevRss} variant="ghost" size="sm">
        KEV RSS
      </Button>
      <Button href={LINKS.api} variant="ghost" size="sm" glyph="→">
        API
      </Button>
    </div>
  );
}

export function CtaBand({
  heading = "Follow the wire.",
  blurb = "Every exploited CVE and adversary move as it lands: Telegram for the push, RSS for your reader, a keyless JSON API and per-actor STIX for your tooling.",
  id = "access",
}: {
  /** Kept for the callers' call sites; nothing is collected any more. */
  source?: string;
  heading?: string;
  blurb?: string;
  id?: string;
}) {
  return (
    <section id={id} className="sheet">
      <div className="double-box p-[3px]">
        <div className="cells md:grid-cols-[1.4fr_1fr]">
          <div className="p-6 sm:p-8">
            <h2 className="headline text-[clamp(1.6rem,3vw,2.4rem)] text-ink">{heading}</h2>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">{blurb}</p>
            <FollowLinks className="mt-6" />
          </div>
          <div className="min-w-0 p-6 sm:p-8">
            <p className="label text-ink">Check your stack</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
              Paste what you run: the CVEs exploited in the wild against it, and who is cited as exploiting them, with the report.
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button href="/stack" variant="ghost" size="sm" glyph="→">
                Stack check
              </Button>
              <span className="label text-ink-3">No key. No signup.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
