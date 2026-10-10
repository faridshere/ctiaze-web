import { Waitlist } from "@/components/Waitlist";
import { LINKS } from "@/lib/site";
import { Button } from "./Button";
import { Kicker } from "./Kicker";
import { Panel } from "./Panel";

// The black card: the one place the page asks for something. An orbital
// wireframe rolls very slowly behind it (structure in cyan, barely there); the
// copy is left-aligned in the card like xintra's "get in touch". `id="access"`
// stays as the anchor older links point at.
//
// 2026-10-10: the ask is "follow", not "wait". The card used to promise that
// early access would open the API and STIX export, which have been live and
// keyless for weeks. It now offers the three ways to follow that exist today
// (Telegram, the KEV-only RSS, the API), and keeps the email form for the one
// thing that genuinely is not built yet: alerts.
function Orbital() {
  const rings = [0.28, 0.5, 0.72, 0.94];
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 800"
      className="orbital absolute -right-[18%] -top-[45%] h-[170%] w-auto opacity-[0.55] max-md:-right-[60%]"
      fill="none"
      stroke="rgba(53,201,214,0.22)"
      strokeWidth="1"
    >
      {rings.map((r) => (
        <ellipse key={r} cx="400" cy="400" rx={380 * r} ry={380} />
      ))}
      {rings.map((r) => (
        <ellipse key={`h${r}`} cx="400" cy="400" rx={380} ry={380 * r} />
      ))}
      <circle cx="400" cy="400" r="380" stroke="rgba(53,201,214,0.4)" />
    </svg>
  );
}

export function FollowLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button href={LINKS.telegram} glyph="↗">
        Follow on Telegram
      </Button>
      <Button href={LINKS.kevRss} variant="ghost">
        KEV RSS
      </Button>
      <Button href={LINKS.api} variant="ghost" glyph="→">
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
    <section id={id} className="mx-auto w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Panel tone="void" className="px-7 py-14 sm:px-14 sm:py-20">
        <Orbital />
        <div className="relative max-w-[34rem]">
          <Kicker>Follow</Kicker>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,4.5vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink-primary">
            {heading}
          </h2>
          <p className="mt-4 max-w-[30rem] text-[15px] leading-relaxed text-ink-secondary">{blurb}</p>
          <FollowLinks className="mt-8" />
          <div className="mt-10 max-w-md">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              email alerts are next · one email when they open
            </p>
            <Waitlist source={source} />
          </div>
        </div>
      </Panel>
    </section>
  );
}
