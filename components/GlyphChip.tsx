import { normalizeCategory, CATEGORY_META, catColor, categoryName } from "@/lib/taxonomy";

// The category tag: a short mono code in the category's own ink, boxed by a
// 1px rule. Same component on the wire, the archive and the story page.
export function GlyphChip({ category, className = "" }: { category: string; className?: string }) {
  const cat = normalizeCategory(category);
  const meta = CATEGORY_META[cat];
  return (
    <span title={categoryName(category, "en")} style={{ color: catColor(cat) }} className={`tag ${className}`}>
      {meta.glyphEn}
    </span>
  );
}
