"use client";

import { useMemo } from "react";
import { CATEGORY_ORDER, CATEGORY_META, categoryName, normalizeCategory, type Category } from "@/lib/taxonomy";
import type { Locale } from "@/lib/locale";

// The site is English-only; these were lib/i18n's getDict(locale).feed strings,
// inlined since only the English render ships (categoryName still takes a
// locale — components/_disabled's Azerbaijani tools pass "az" through it).
const SPEKTR_FILTER_LABEL = "Category spectrum — filter";
const DISPATCH_WORD = "dispatches";
function spektrLabel(n: number): string {
  return `Last ${n} dispatches · spectrum`;
}

// The category spectrum, set in ink for the paper (v4). A distribution bar
// computed entirely in-component from the dispatches actually rendered, so
// every number is a real count (never a passed-in claim). It prints in two
// inks only — the segment in question solid ink, the rest the soft rule — so
// the paper never carries an eight-colour chart (the --cat-* tokens are not
// used here any more). The "mini" variant is a quiet ledger line: a 3px bar
// with the dispatch's own category in ink and the counts in mono beneath. It
// links nowhere: the front page no longer reads a category filter from the
// URL, and a link that filters nothing is not honest. The "full" variant is
// the interactive filter kept for the shelved feed tools. Priority flags
// (KEV/CVE/AZ) are a SEPARATE dimension — counters outside the bar, shown
// only when > 0.

// Only what the strip counts (2026-10-10). This is a client component, so its
// props are serialised into the page's RSC payload: the story page used to
// hand it 60 full Story objects (~110 KB per page) to count four things.
// A Story still satisfies this type, so existing callers keep working.
export type SpektrItem = { category: string; kev: boolean; region: boolean; cveIds?: string[]; hasCve?: boolean };

export type SpektrActive = { cat: Category | null; kev: boolean; cve: boolean; az: boolean };

export const EMPTY_ACTIVE: SpektrActive = { cat: null, kev: false, cve: false, az: false };

function useCounts(stories: SpektrItem[]) {
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
      cve: stories.filter((s) => s.hasCve ?? (s.cveIds?.length ?? 0) > 0).length,
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
  locale = "en",
}: {
  stories: SpektrItem[];
  variant?: "full" | "mini";
  active?: SpektrActive;
  onChange?: (next: SpektrActive) => void;
  ownCategory?: string;
  caption?: string;
  shown?: number; // count after filtering, for the "n/total" readout
  /** Site is English-only; kept for components/_disabled, which may still pass "az". */
  locale?: Locale;
}) {
  const { segments, total, kev, cve, az } = useCounts(stories);
  const anyFilter = active.cat !== null || active.kev || active.cve || active.az;

  // ---------------- MINI: a quiet ledger line, no interaction ----------------
  if (variant === "mini") {
    const own = ownCategory ? normalizeCategory(ownCategory) : null;
    const ownCount = own !== null ? segments.find((s) => s.cat === own)?.count ?? 0 : 0;
    return (
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="label text-ink-3">{caption ?? spektrLabel(total)}</span>
          {own !== null && (
            <span className="num font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
              {CATEGORY_META[own].glyphEn} {ownCount} of {total}
            </span>
          )}
        </div>
        <div className="mt-2 flex h-[3px] w-full gap-px" aria-hidden>
          {segments.map(({ cat, count }) => (
            <span
              key={cat}
              style={{
                flexGrow: count,
                flexBasis: 0,
                minWidth: 2,
                background: own === null || cat === own ? "var(--ink)" : "var(--rule-soft)",
              }}
              className="block"
            />
          ))}
        </div>
        <p className="num mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
          {segments.map(({ cat, count }) => (
            <span key={cat} title={categoryName(cat, locale)} className={cat === own ? "text-ink" : ""}>
              {CATEGORY_META[cat].glyphEn} {count}
            </span>
          ))}
        </p>
      </div>
    );
  }

  // ---------------- FULL: interactive filter ----------------
  const set = (patch: Partial<SpektrActive>) => onChange?.({ ...active, ...patch });
  const toggleCat = (cat: Category) => set({ cat: active.cat === cat ? null : cat });

  return (
    <div>
      {/* label row + the priority counters */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="label text-ink-3">{spektrLabel(total)}</span>
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
              tone="ink"
              pressed={active.az}
              onClick={() => set({ az: !active.az })}
            />
          )}
        </div>
      </div>

      {/* the bar — fixed 14px container so hover-grow never reflows */}
      <div
        role="toolbar"
        aria-label={SPEKTR_FILTER_LABEL}
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
              title={`${categoryName(cat, locale)} · ${count}`}
              aria-label={`${categoryName(cat, locale)}: ${count} ${DISPATCH_WORD}`}
              onClick={() => toggleCat(cat)}
              style={{
                flexGrow: count,
                flexBasis: 0,
                minWidth: 6,
                background: dim ? "var(--rule-soft)" : on ? "var(--ink)" : "var(--ink-3)",
              }}
              className={`relative block h-2.5 transition-[height] duration-150 hover:h-3.5 focus-visible:h-3.5 ${
                on ? "h-3.5" : ""
              }`}
            >
              {on && <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-ink" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* legend — code + count, each a toggle mirroring its segment */}
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
                title={categoryName(cat, locale)}
                className={`inline-flex items-center gap-1.5 transition-opacity ${
                  active.cat !== null && !on ? "opacity-45 hover:opacity-100" : ""
                }`}
              >
                <span className="tag text-ink-2">{CATEGORY_META[cat].glyphEn}</span>
                <span className="num font-mono text-[11px] text-ink-2">{count}</span>
              </button>
            );
          })}
        </div>
        {anyFilter && typeof shown === "number" && (
          <span className="num shrink-0 font-mono text-[11px] text-ink-3">
            {shown}/{total}
          </span>
        )}
      </div>
    </div>
  );
}

// A pressable counter in the label voice: a 1px box in its ink, filled when
// pressed. Stamp red only for KEV; everything else is ink.
function BurnTick({
  label,
  tone,
  pressed,
  onClick,
}: {
  label: string;
  tone: "critical" | "ink";
  pressed: boolean;
  onClick: () => void;
}) {
  const color = tone === "critical" ? "var(--stamp)" : "var(--ink)";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={
        pressed
          ? { background: color, borderColor: color, color: "var(--paper)" }
          : { borderColor: color, color }
      }
      className="label border px-1.5 py-0.5"
    >
      {label}
    </button>
  );
}
