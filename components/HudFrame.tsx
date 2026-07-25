// Four faint corner brackets fixed to the viewport — a monitoring-console
// frame that, with the radar canvas behind the content, makes the whole page
// read as a live intelligence surface rather than a blog. Server-rendered
// static SVG, no JS, pointer-events: none, so it costs nothing and touches
// nothing. Hidden on small screens where the margins are too tight to earn it.
const CORNERS = [
  { pos: "top-3 left-3", d: "M0 12V0h12" },
  { pos: "top-3 right-3", d: "M12 12V0H0" },
  { pos: "bottom-3 left-3", d: "M0 0v12h12" },
  { pos: "bottom-3 right-3", d: "M12 0v12H0" },
] as const;

export function HudFrame() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] hidden md:block">
      {CORNERS.map((c) => (
        <svg
          key={c.pos}
          viewBox="0 0 12 12"
          className={`absolute ${c.pos} size-3 text-ink-muted/40`}
        >
          <path d={c.d} fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}
