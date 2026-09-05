// `● LABEL` — the section label. Mono, small, tracked. The dot goes orange and
// pulses only when the label describes something genuinely live (the wire).
// One kicker per section; it introduces, it never decorates.
export function Kicker({
  children,
  live = false,
  className = "",
}: {
  children: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted ${className}`}
    >
      <span
        aria-hidden
        className={`inline-block size-1.5 shrink-0 rounded-full ${live ? "signal-dot bg-brand" : "bg-ink-muted/70"}`}
      />
      <span>{children}</span>
    </span>
  );
}
