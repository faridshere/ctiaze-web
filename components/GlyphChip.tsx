"use client";

import { normalizeCategory, CATEGORY_META, catColor, categoryName } from "@/lib/taxonomy";
import { useLocale } from "./locale";

// The category glyph — a 2-letter mono code in the category's ink color, outline
// only. Same component in the Spektr legend, ledger rows, story detail, /cve, /ioc.
export function GlyphChip({
  category,
  className = "",
}: {
  category: string;
  className?: string;
}) {
  const locale = useLocale();
  const cat = normalizeCategory(category);
  const meta = CATEGORY_META[cat];
  return (
    <span
      title={categoryName(category, locale)}
      style={{ color: catColor(cat), borderColor: catColor(cat) }}
      className={`inline-block rounded-[var(--radius-chip)] border px-1 font-mono text-[length:var(--t-micro)] font-semibold uppercase leading-[1.5] tracking-[0.06em] ${className}`}
    >
      {meta.glyph}
    </span>
  );
}
