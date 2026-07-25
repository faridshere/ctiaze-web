import type { Story } from "@/lib/types";

// The intel-summary rail. Counts up top, then a category distribution drawn as
// single-hue magnitude bars (dataviz method: one measure — count — per
// category, so identity is carried by the label and only length encodes
// magnitude; no rainbow, no color-as-category). Honest, compact, and it makes
// the sidebar feel like a briefing panel rather than a list of links.
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
  const cats = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = cats.length ? cats[0][1] : 1;

  return (
    <aside className="lg:pt-1 space-y-9">
      <div>
        <PanelHead>arxiv</PanelHead>
        <dl className="mt-3 space-y-2">
          <Row label="dərc olunub" value={total} />
          <Row label="aktiv istismar (KEV)" value={kevCount} critical={kevCount > 0} />
          <Row label="bu səhifədə" value={stories.length} />
        </dl>
      </div>

      {cats.length > 0 && (
        <div>
          <PanelHead>mövzu paylanması</PanelHead>
          <ul className="mt-3.5 space-y-2.5">
            {cats.map(([cat, count]) => (
              <li key={cat}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-secondary truncate">
                    {cat}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-ink-muted shrink-0">
                    {count}
                  </span>
                </div>
                <div className="mt-1 h-[3px] w-full bg-hairline overflow-hidden">
                  <div
                    className="h-full bg-ink-secondary/70"
                    style={{ width: `${Math.max(6, (count / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <PanelHead>izlə</PanelHead>
        <a
          href="https://t.me/ctiaze"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-between font-mono text-xs text-ink-secondary hover:text-ink-primary transition-colors"
        >
          <span>@ctiaze · telegram</span>
          <span aria-hidden>↗</span>
        </a>
      </div>
    </aside>
  );
}

function PanelHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted pb-2.5 border-b border-hairline">
      <span className="text-accent-critical/70">▚</span>
      {children}
    </h2>
  );
}

function Row({ label, value, critical = false }: { label: string; value: number; critical?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className={`font-mono text-sm tabular-nums ${critical ? "text-accent-critical" : "text-ink-primary"}`}>
        {String(value).padStart(2, "0")}
      </dd>
    </div>
  );
}
