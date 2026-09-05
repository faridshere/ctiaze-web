import { Waitlist } from "@/components/Waitlist";
import { Kicker } from "./Kicker";
import { Panel } from "./Panel";

// The black card: the one place the page asks for something. An orbital
// wireframe rolls very slowly behind it (structure in cyan, barely there); the
// copy is left-aligned in the card like xintra's "get in touch". `id="access"`
// is what the header's Early access button jumps to.
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

export function CtaBand({
  source,
  heading = "Want the keys?",
  blurb = "Free early access when the API and MCP server open — more tools, deeper data, your own login. One email when it's ready. Nothing else, ever.",
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
          <Kicker>Early access</Kicker>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,4.5vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink-primary">
            {heading}
          </h2>
          <p className="mt-4 max-w-[30rem] text-[15px] leading-relaxed text-ink-secondary">{blurb}</p>
          <div className="mt-8 max-w-md">
            <Waitlist source={source} />
          </div>
        </div>
      </Panel>
    </section>
  );
}
