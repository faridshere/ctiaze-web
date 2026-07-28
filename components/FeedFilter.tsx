"use client";

import { useMemo, useState } from "react";
import { StoryRow } from "./StoryRow";
import type { Story } from "@/lib/types";

// Triage filter over the feed — narrow to what matters this shift. All fields
// are already on each Story, so this is pure client-side filtering (cheap).
export function FeedFilter({ stories }: { stories: Story[] }) {
  const [cat, setCat] = useState<string>("all");
  const [kevOnly, setKevOnly] = useState(false);
  const [regionOnly, setRegionOnly] = useState(false);
  const [cveOnly, setCveOnly] = useState(false);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stories) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [stories]);

  const filtered = stories.filter(
    (s) =>
      (cat === "all" || s.category === cat) &&
      (!kevOnly || s.kev) &&
      (!regionOnly || s.region) &&
      (!cveOnly || s.cveIds.length > 0)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>
          hamısı
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? "all" : c)}>
            {c}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-hairline" aria-hidden />
        <Chip active={kevOnly} tone="crit" onClick={() => setKevOnly((v) => !v)}>
          KEV
        </Chip>
        <Chip active={regionOnly} onClick={() => setRegionOnly((v) => !v)}>
          AZ
        </Chip>
        <Chip active={cveOnly} onClick={() => setCveOnly((v) => !v)}>
          CVE var
        </Chip>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-muted">
          {filtered.length}/{stories.length}
        </span>
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="py-10 text-center font-mono text-sm text-ink-muted">
            bu filtrə uyğun xəbər yoxdur
          </p>
        ) : (
          filtered.map((story) => <StoryRow key={story.id} story={story} />)
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  tone = "brand",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "brand" | "crit";
  children: React.ReactNode;
}) {
  const activeCls =
    tone === "crit"
      ? "border-accent-critical bg-accent-critical/10 text-accent-critical"
      : "border-brand bg-brand-wash text-brand";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
        active ? activeCls : "border-hairline text-ink-secondary hover:border-ink-secondary hover:text-ink-primary"
      }`}
    >
      {children}
    </button>
  );
}
