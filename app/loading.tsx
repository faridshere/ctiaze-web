// Brand-register skeleton shown during navigation / server render instead of a
// blank tab. animate-pulse is disabled under prefers-reduced-motion (globals.css).
export default function Loading() {
  return (
    <div className="ops min-h-screen" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-[75rem] px-[var(--sp-gutter)] py-16">
        <div className="h-7 w-56 animate-pulse rounded bg-surface-raised" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-surface-raised/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
