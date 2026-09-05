// Brand-register skeleton shown during navigation / server render instead of a
// blank tab: a header-height bar, a PageHead-shaped block, seven row bars.
// animate-pulse is disabled under prefers-reduced-motion (globals.css).
export default function Loading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-live="polite">
      <div className="h-14 border-b border-hairline bg-surface-raised/60" />
      <div className="mx-auto w-full max-w-[80rem] px-[var(--sp-gutter)] pt-12 sm:pt-20">
        <div className="h-4 w-40 animate-pulse rounded-[var(--radius-chip)] bg-surface-raised" />
        <div className="mt-6 h-12 w-2/3 max-w-xl animate-pulse rounded-[var(--radius-btn)] bg-surface-raised" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-[var(--radius-panel)] bg-surface-raised/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
