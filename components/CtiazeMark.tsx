// The skopnix mark — "the triad", liquid-fused: a hub and three sensor nodes
// merged into one metaball body (SVG goo filter), the top node lit signal-orange.
// The fusion is the point: one organism, not parts. Echoed in app/icon.svg.
export function CtiazeMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <filter id="skx-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.75" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="g" />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
      </defs>
      <g filter="url(#skx-goo)">
        <g stroke="currentColor" strokeWidth="4.4" strokeLinecap="round">
          <path d="M16 15.5 L16 7" />
          <path d="M16 15.5 L8 22" />
          <path d="M16 15.5 L24 22" />
        </g>
        <circle cx="16" cy="15.5" r="3.4" fill="currentColor" />
        <circle cx="8" cy="22" r="3.6" fill="currentColor" />
        <circle cx="24" cy="22" r="3.6" fill="currentColor" />
        <circle cx="16" cy="7" r="3.8" fill="currentColor" />
      </g>
      <circle cx="16" cy="7" r="3.8" className="fill-brand" />
    </svg>
  );
}
