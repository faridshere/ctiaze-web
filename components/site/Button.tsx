import Link from "next/link";

// The one button. Mono uppercase chrome with a trailing glyph, three variants:
//   primary — signal orange, the single orange element in a view
//   ghost   — hairline, for the secondary action beside a primary
//   pill    — rounded-full hairline, for outbound links (footer)
// Renders <Link> for internal hrefs, <a target=_blank> for external ones, and a
// real <button> when there is no href (form submit).
type Variant = "primary" | "ghost" | "pill";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono uppercase tracking-[0.12em] transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<Variant, string> = {
  primary:
    "rounded-[var(--radius-btn)] bg-brand text-[#170a03] hover:-translate-y-px hover:bg-[#ff6f3d]",
  ghost:
    "rounded-[var(--radius-btn)] border border-hairline text-ink-secondary hover:border-ink-muted hover:text-ink-primary",
  pill:
    "rounded-full border border-hairline text-ink-secondary hover:border-ink-muted hover:text-ink-primary",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[11px]",
  md: "h-12 px-5 text-[12px]",
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
  const cls = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {glyph && (
        <span aria-hidden className="translate-y-px text-[1.1em] leading-none">
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
