// A boxed block on the paper: a 1px rule all round, no radius, no shadow.
// `limb` prints a 2px ink rule along the top (the box that leads a section);
// tone "void" sets it on the deeper stock. `interactive` only changes the
// border on hover: the paper does not lift.
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
  /** raised = the paper; void = the deeper stock */
  tone?: "raised" | "void";
  interactive?: boolean;
}) {
  const bg = tone === "void" ? "bg-paper-deep" : "bg-paper";
  const hover = interactive ? "transition-colors duration-300 hover:border-ink" : "";
  const top = limb ? "border-t-2 border-t-ink" : "";
  return (
    <div className={`relative overflow-hidden border border-rule-soft ${top} ${bg} ${hover} ${className}`}>
      {children}
    </div>
  );
}
