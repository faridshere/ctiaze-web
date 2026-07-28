// Hand-drawn corner-bracket reticle — the site's mark, echoed in app/icon.svg
// for the favicon. Uses currentColor/theme tokens so it adapts with the page,
// unlike the fixed-color favicon.
export function CtiazeMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
        <path d="M4 11V4h7" />
        <path d="M21 4h7v7" />
        <path d="M28 21v7h-7" />
        <path d="M11 28H4v-7" />
      </g>
      <circle cx="16" cy="16" r="2.4" className="fill-brand" />
    </svg>
  );
}
