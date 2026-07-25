import type { Story } from "@/lib/types";

// Not a chart — a handful of counts don't earn one (dataviz skill: sometimes
// the right form is a stat tile, not a plot). Plain numbers, no color coding
// beyond what StoryRow/SeverityMarker already carry.
export function StatsAside({
  stories,
  total,
  kevCount,
}: {
  stories: Story[];
  total: number;
  kevCount: number;
}) {
  const byCategory = new Map<string, number>();
  for (const s of stories) {
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1);
  }
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <aside className="lg:pt-1 space-y-8">
      <div>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted pb-3 border-b border-hairline">
          arxiv
        </h2>
        <dl className="mt-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <dt className="text-sm text-ink-secondary">dərc olunub</dt>
            <dd className="font-mono text-sm tabular-nums text-ink-primary">{total}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-sm text-ink-secondary">aktiv istismar (KEV)</dt>
            <dd className="font-mono text-sm tabular-nums text-accent-critical">{kevCount}</dd>
          </div>
        </dl>
      </div>

      {topCategories.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted pb-3 border-b border-hairline">
            mövzular
          </h2>
          <ul className="mt-3 space-y-2">
            {topCategories.map(([cat, count]) => (
              <li key={cat} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-secondary uppercase tracking-wide truncate">
                  {cat}
                </span>
                <span className="font-mono text-xs tabular-nums text-ink-muted shrink-0">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted pb-3 border-b border-hairline">
          izlə
        </h2>
        <a
          href="https://t.me/ctiaze"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-between text-sm text-ink-secondary hover:text-ink-primary transition-colors"
        >
          <span>@ctiaze Telegram</span>
          <span aria-hidden>→</span>
        </a>
      </div>
    </aside>
  );
}
