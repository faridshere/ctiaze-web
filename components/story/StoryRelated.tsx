import Link from "next/link";
import type { Story } from "@/lib/types";
import { RuledSection } from "./Ruled";

// Precomputed semantic neighbours (ops/embed_related.py) — real internal
// links, no live inference, no extra query. A ledger of ruled rows in two
// newspaper columns on a desk, one on a phone.
export function StoryRelated({ related }: { related: Story["related"] }) {
  if (related.length === 0) return null;
  return (
    <RuledSection as="nav" ariaLabel="Related dispatches" label="Related dispatches" meta={`${related.length} on file`}>
      <ol className="grid gap-x-10 md:grid-cols-2">
        {related.map((r) => (
          <li key={r.slug} className="row">
            <Link href={`/news/${r.slug}`} className="group flex min-h-[44px] items-center py-2.5">
              <span className="text-[14px] leading-[1.3] text-ink group-hover:underline">{r.titleEn}</span>
            </Link>
          </li>
        ))}
      </ol>
    </RuledSection>
  );
}
