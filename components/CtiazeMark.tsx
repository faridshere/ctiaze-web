// The skopnix mark — "the triad": a live sensor grid. A hub node linked to three
// sensors, one lit signal-orange — the moment the grid catches something. A
// connected-node molecule in the family of network/constellation marks. Echoed
// in app/icon.svg.
export function CtiazeMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.9" strokeLinecap="round">
        <path d="M16 15.3 L16 6" />
        <path d="M16 15.3 L7 22.6" />
        <path d="M16 15.3 L25 22.6" />
      </g>
      <circle cx="16" cy="15.3" r="3" fill="currentColor" />
      <circle cx="7" cy="22.6" r="3.2" fill="currentColor" />
      <circle cx="25" cy="22.6" r="3.2" fill="currentColor" />
      <circle cx="16" cy="6" r="3.5" className="fill-brand" />
    </svg>
  );
}
