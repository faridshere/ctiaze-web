// A raised surface: hairline border, the panel radius, no shadow. `limb` draws
// the cyan horizon line along the top edge — structure, not decoration, so use
// it on the panel that matters in a section, not on all of them. `interactive`
// gives a panel the quiet lift-and-brighten hover of something you can act on.
export function Panel({
  children,
  className = "",
  limb = false,
  tone = "raised",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  limb?: boolean;
  /** raised = default panel; void = the black card (CTA band) */
  tone?: "raised" | "void";
  interactive?: boolean;
}) {
  const bg = tone === "void" ? "bg-void" : "bg-surface-raised";
  const hover = interactive
    ? "transition-[border-color,transform] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-ink-muted/40"
    : "";
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-panel)] border border-hairline ${bg} ${hover} ${className}`}>
      {limb && <span aria-hidden className="limb-line absolute inset-x-8 top-0" />}
      {children}
    </div>
  );
}
