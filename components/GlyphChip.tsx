import { normalizeCategory, CATEGORY_META, catColor, categoryName } from "@/lib/taxonomy";

// The category glyph — a 2-letter mono code in the category's ink colour,
// outline only. Same component on the story page and in the shelved tools.
export function GlyphChip({ category, className = "" }: { category: string; className?: string }) {
  const cat = normalizeCategory(category);
  const meta = CATEGORY_META[cat];
  return (
    <span
      title={categoryName(category, "en")}
      style={{ color: catColor(cat), borderColor: catColor(cat) }}
      className={`inline-block rounded-[var(--radius-chip)] border px-1 font-mono text-[length:var(--t-micro)] font-semibold uppercase leading-[1.5] tracking-[0.06em] ${className}`}
    >
      {meta.glyph}
    </span>
  );
}
