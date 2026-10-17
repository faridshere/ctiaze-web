// A ruled section of the story page: a condensed label head on a 1px ink
// rule, an optional mono meta line at the right, then the content. Every
// block under the deck (signals, CVE table, sources, intel, related) is set
// this way, so the page reads as columns of one paper rather than panels.
export function RuledSection({
  label,
  meta,
  children,
  className = "",
  id,
  as: Tag = "section",
  ariaLabel,
}: {
  label: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "nav" | "div";
  ariaLabel?: string;
}) {
  return (
    <Tag id={id} className={`mt-10 ${className}`} aria-label={ariaLabel}>
      <div className="rule-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
        <h2 className="label text-ink">{label}</h2>
        {meta && <span className="num font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">{meta}</span>}
      </div>
      {children}
    </Tag>
  );
}

// The filled ink block the width of a word, for a slot that must exist on the
// page but which no source states. Captioned so the reader is never misled.
export function Redaction({ caption = "not stated by sources" }: { caption?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="inline-block h-[0.9em] w-[5ch] bg-ink align-middle" />
      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">{caption}</span>
    </span>
  );
}
