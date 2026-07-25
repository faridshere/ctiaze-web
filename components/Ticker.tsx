// Pure CSS marquee — no client JS needed for a scroll animation. The track is
// duplicated once so the loop is seamless (animate exactly -50%, i.e. one copy's
// width), and the whole thing freezes under prefers-reduced-motion (see globals.css).
export function Ticker({ headlines }: { headlines: string[] }) {
  if (headlines.length === 0) return null;

  const row = (
    <div className="ticker-track flex shrink-0 items-center gap-8 pr-8">
      {headlines.map((h, i) => (
        <span key={i} className="flex items-center gap-8 whitespace-nowrap">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-secondary">
            {h}
          </span>
          <span className="text-accent-critical text-[10px]" aria-hidden>
            ◆
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="border-b border-hairline bg-surface-raised overflow-hidden">
      <div className="ticker-viewport flex w-full py-2">
        {row}
        {row}
      </div>
    </div>
  );
}
