// The skopnix mark — "the Signal": a live blip on the wire. A flat intelligence
// baseline spikes once into a sharp detection peak, with one signal-orange node
// at the apex — the moment something is seen on the wire. Echoed in app/icon.svg.
export function CtiazeMark({ className = "h-4 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 26" className={className} aria-hidden="true" fill="none">
      <path d="M3 18.5 H19 L22 4 L24.5 18.5 H41" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="miter" />
      <circle cx="22" cy="4" r="2.5" className="fill-brand" />
    </svg>
  );
}
