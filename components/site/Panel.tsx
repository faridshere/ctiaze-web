// A raised surface: hairline border, the panel radius, no shadow. `limb` draws
// the cyan horizon line along the top edge — structure, not decoration, so use
// it on the panel that matters in a section, not on all of them.
export function Panel({
  children,
  className = "",
  limb = false,
  tone = "raised",
}: {
  children: React.ReactNode;
  className?: string;
  limb?: boolean;
  /** raised = default panel; void = the black card (CTA band) */
  tone?: "raised" | "void";
}) {
  const bg = tone === "void" ? "bg-void" : "bg-surface-raised";
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-panel)] border border-hairline ${bg} ${className}`}>
      {limb && <span aria-hidden className="limb-line absolute inset-x-8 top-0" />}
      {children}
    </div>
  );
}
