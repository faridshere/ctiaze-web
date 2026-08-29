// The skopnix mark — an "aperture limb": an open planetary ring (the sightline),
// a short cyan scan-arc rising into the breach, and one signal-orange node seated
// in the gap (a region detected on the limb). Echoed in app/icon.svg.
export function CtiazeMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M19.09 6.49 A10 10 0 1 0 22.69 23.43" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22.69 23.43 A10 10 0 0 0 25.9 14.61" fill="none" stroke="#6FD3E6" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="23.66" cy="9.57" r="2.9" className="fill-brand" />
    </svg>
  );
}
