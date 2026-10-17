import { Waitlist } from "@/components/Waitlist";
import { LINKS } from "@/lib/site";
import { Button } from "./Button";

// The follow box at the foot of an inner page: a double-ruled classified with
// the three ways to follow that exist today (Telegram, RSS, the API) and the
// email form for the one thing that is not built yet (alerts). `id="access"`
// stays as the anchor older links point at.
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
  source,
  heading = "Follow the wire.",
  blurb = "Every exploited CVE and adversary move as it lands: Telegram for the push, RSS for your reader, a keyless JSON API and per-actor STIX for your tooling.",
  id = "access",
}: {
  source: string;
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
          <div className="p-6 sm:p-8">
            <p className="label text-ink">Email alerts are next</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">One email when they open. Nothing else, ever.</p>
            <div className="mt-4">
              <Waitlist source={source} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
