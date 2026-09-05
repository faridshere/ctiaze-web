import Link from "next/link";
import type { Story } from "@/lib/types";

// Precomputed semantic neighbours (ops/embed_related.py) — real internal links,
// no live inference, no extra query. Grouped into 2-column rows so the hairline
// divider reads as a row separator rather than a per-link rule.
export function StoryRelated({ related }: { related: Story["related"] }) {
  if (related.length === 0) return null;
  const rows: (typeof related)[] = [];
  for (let i = 0; i < related.length; i += 2) rows.push(related.slice(i, i + 2));

  return (
    <nav aria-label="Related stories" className="mt-10 border-t border-hairline pt-6">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">Related</h2>
      <ul className="mt-2">
        {rows.map((row) => (
          <li
            key={row[0].slug}
            className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-hairline py-3 first:border-t-0 sm:grid-cols-2"
          >
            {row.map((r) => (
              <Link
                key={r.slug}
                href={`/news/${r.slug}`}
                className="text-[14px] leading-snug text-ink-secondary transition-colors hover:text-brand"
              >
                {r.titleEn}
              </Link>
            ))}
          </li>
        ))}
      </ul>
    </nav>
  );
}
