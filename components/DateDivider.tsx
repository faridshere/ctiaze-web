// Ledger day-divider — mono micro caps, a hairline under it. The date lives here
// (once per day group), so individual rows need only their time.
export function DateDivider({ label }: { label: string }) {
  return (
    <div className="border-b border-hairline pb-1.5 pt-[calc(var(--sp-section)/2)] font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted">
      {label}
    </div>
  );
}
