// The dateline-style label above a section: condensed Archivo, uppercase,
// tracked. Carries the one live dot only when the label describes something
// genuinely live (the wire). In v4 it is a label, never a decoration: use it
// where a newspaper would print a section head or a kicker, nowhere else.
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
    <span className={`label inline-flex items-center gap-2 text-ink-3 ${className}`}>
      {live && <span aria-hidden className="live-dot" />}
      <span>{children}</span>
    </span>
  );
}
