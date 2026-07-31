"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Story } from "@/lib/types";
import { CATEGORY_ORDER, CATEGORY_META, catColor, normalizeCategory, type Category } from "@/lib/taxonomy";

// SPEKTR ZOLAĞI — the signature instrument. A category-distribution bar computed
// entirely in-component from the stories actually rendered, so every number is a
// real count (never a passed-in claim). It is the honest reincarnation of Ground
// News's bias bar: category, not politics. On the home ledger it doubles as the
// feed filter; elsewhere a non-interactive "mini" variant situates one briefing
// in the live spectrum. Priority flags (KEV/CVE/AZ) are a SEPARATE dimension —
// counters outside the bar, shown only when > 0.

export type SpektrActive = { cat: Category | null; kev: boolean; cve: boolean; az: boolean };

export const EMPTY_ACTIVE: SpektrActive = { cat: null, kev: false, cve: false, az: false };

function useCounts(stories: Story[]) {
  return useMemo(() => {
    const m = new Map<Category, number>();
    for (const s of stories) {
      const c = normalizeCategory(s.category);
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    const segments = [...m.entries()]
      .map(([cat, count]) => ({ cat, count }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          CATEGORY_ORDER.indexOf(a.cat) - CATEGORY_ORDER.indexOf(b.cat)
      );
    return {
      segments,
      total: stories.length,
      kev: stories.filter((s) => s.kev).length,
      cve: stories.filter((s) => s.cveIds.length > 0).length,
      az: stories.filter((s) => s.region).length,
    };
  }, [stories]);
}

export function SpektrStrip({
  stories,
  variant = "full",
  active = EMPTY_ACTIVE,
  onChange,
  ownCategory,
  caption,
  shown,
}: {
  stories: Story[];
  variant?: "full" | "mini";
  active?: SpektrActive;
  onChange?: (next: SpektrActive) => void;
  ownCategory?: string;
  caption?: string;
  shown?: number; // count after filtering, for the "n/total" readout
}) {
  const { segments, total, kev, cve, az } = useCounts(stories);
  const anyFilter = active.cat !== null || active.kev || active.cve || active.az;

  // ---------------- MINI: non-interactive, links only ----------------
  if (variant === "mini") {
    const own = ownCategory ? normalizeCategory(ownCategory) : null;
    return (
      <div>
        <div className="flex h-1.5 w-full overflow-hidden">
          {segments.map(({ cat, count }) => {
            const dim = own !== null && cat !== own;
            return (
              <Link
                key={cat}
                href={`/?kat=${cat}`}
                title={`${CATEGORY_META[cat].name} · ${count}`}
                aria-label={`${CATEGORY_META[cat].name}: ${count} dispaç`}
                style={{
                  flexGrow: count,
                  flexBasis: 0,
                  minWidth: 4,
                  background: catColor(cat),
                  opacity: dim ? 0.32 : own === cat ? 1 : 0.85,
                }}
                className="block"
              />
            );
          })}
        </div>
        {caption && (
          <p className="mt-1.5 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] text-ink-muted">
            {caption}
          </p>
        )}
      </div>
    );
  }

  // ---------------- FULL: interactive filter ----------------
  const set = (patch: Partial<SpektrActive>) => onChange?.({ ...active, ...patch });
  const toggleCat = (cat: Category) => set({ cat: active.cat === cat ? null : cat });

  return (
    <div>
      {/* label row + burn-ticks */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted">
          Son {total} dispaç · spektr
        </span>
        <div className="flex items-center gap-1.5">
          {kev > 0 && (
            <BurnTick
              label={`KEV ${kev}`}
              tone="critical"
              pressed={active.kev}
              onClick={() => set({ kev: !active.kev })}
            />
          )}
          {cve > 0 && (
            <BurnTick
              label={`CVE ${cve}`}
              tone="ink"
              pressed={active.cve}
              onClick={() => set({ cve: !active.cve })}
            />
          )}
          {az > 0 && (
            <BurnTick
              label={`AZ ${az}`}
              tone="brand"
              pressed={active.az}
              onClick={() => set({ az: !active.az })}
            />
          )}
        </div>
      </div>

      {/* the bar — fixed 14px container so hover-grow never reflows */}
      <div
        role="toolbar"
        aria-label="Kateqoriya spektri — süzgəc"
        className="mt-2 flex h-3.5 w-full items-end gap-px"
      >
        {segments.map(({ cat, count }) => {
          const on = active.cat === cat;
          const dim = active.cat !== null && !on;
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={on}
              title={`${CATEGORY_META[cat].name} · ${count}`}
              aria-label={`${CATEGORY_META[cat].name}: ${count} dispaç`}
              onClick={() => toggleCat(cat)}
              style={{
                flexGrow: count,
                flexBasis: 0,
                minWidth: 6,
                background: catColor(cat),
                opacity: dim ? 0.32 : 1,
              }}
              className={`relative block h-2.5 transition-[height] duration-150 hover:h-3.5 focus-visible:h-3.5 ${
                on ? "h-3.5" : ""
              }`}
            >
              {on && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-brand" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* legend — glyph + count, each a toggle mirroring its segment */}
      <div className="mt-3 flex items-center gap-x-3 gap-y-1.5 overflow-x-auto">
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          {segments.map(({ cat, count }) => {
            const on = active.cat === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCat(cat)}
                title={CATEGORY_META[cat].name}
                className={`group inline-flex items-center gap-1 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.06em] transition-opacity ${
                  active.cat !== null && !on ? "opacity-45 hover:opacity-100" : ""
                }`}
              >
                <span
                  style={{ color: catColor(cat), borderColor: catColor(cat) }}
                  className="rounded-[var(--radius-chip)] border px-1 font-semibold"
                >
                  {CATEGORY_META[cat].glyph}
                </span>
                <span className="tabular-nums text-ink-secondary">{count}</span>
              </button>
            );
          })}
        </div>
        {anyFilter && typeof shown === "number" && (
          <span className="shrink-0 font-mono text-[length:var(--t-micro)] tabular-nums text-ink-muted">
            {shown}/{total}
          </span>
        )}
      </div>
    </div>
  );
}

function BurnTick({
  label,
  tone,
  pressed,
  onClick,
}: {
  label: string;
  tone: "critical" | "ink" | "brand";
  pressed: boolean;
  onClick: () => void;
}) {
  const color =
    tone === "critical" ? "var(--accent-critical)" : tone === "brand" ? "var(--brand)" : "var(--ink-secondary)";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={
        pressed
          ? { background: color, borderColor: color, color: "var(--surface)" }
          : { borderColor: color, color }
      }
      className="rounded-[var(--radius-chip)] border px-1.5 py-px font-mono text-[length:var(--t-micro)] font-semibold uppercase tracking-[0.06em]"
    >
      {label}
    </button>
  );
}
