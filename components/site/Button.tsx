import Link from "next/link";

// The one button, in the paper's vocabulary. Condensed uppercase label with a
// trailing glyph, three variants:
//   primary — ink block, paper text (the single filled control in a view)
//   ghost   — 1px ink box
//   pill    — bare underlined label, for outbound links in running chrome
// Renders <Link> for internal hrefs, <a target=_blank> for external ones, and a
// real <button> when there is no href (form submit).
type Variant = "primary" | "ghost" | "pill";
type Size = "sm" | "md";

const BASE =
  "label inline-flex items-center justify-center gap-2 whitespace-nowrap transition-[background-color,border-color,color] duration-200 ease-[var(--ease-out)] disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2",
  ghost: "border border-ink text-ink hover:bg-ink hover:text-paper",
  pill: "text-ink-2 underline decoration-rule-soft underline-offset-4 hover:text-ink hover:decoration-ink",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5",
  md: "h-12 px-5",
};

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  glyph,
  type = "button",
  disabled,
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  href?: string;
  variant?: Variant;
  size?: Size;
  /** trailing glyph: "→" internal, "↗" outbound */
  glyph?: "→" | "↗";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const sizing = variant === "pill" ? "px-0 py-1" : SIZE[size];
  const cls = `${BASE} ${VARIANT[variant]} ${sizing} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {glyph && (
        <span aria-hidden className="translate-y-px font-mono text-[1.1em] leading-none">
          {glyph}
        </span>
      )}
    </>
  );
  if (href && /^(https?:|mailto:)/.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={ariaLabel}>
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} className={cls} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}
