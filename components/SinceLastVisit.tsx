"use client";

import { useEffect, useSyncExternalStore } from "react";

// Where we remember the archive size the reader last saw. A returning SOC
// analyst's first question is "what changed since yesterday?" — comparing the
// live total against this remembered total gives them a one-line answer.
const KEY = "ctiaze_seen";

// React-blessed read of a client-only store (localStorage) with no
// setState-in-effect: SSR + the first client render both use the server
// snapshot (null → render nothing, so there's no hydration mismatch), then the
// client swaps in the real stored value. Same pattern as SectorRecall.
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function getSnapshot(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function getServerSnapshot(): string | null {
  return null;
}

/**
 * "Since your last visit" retention strip. Reads the archive total the reader
 * last saw, compares it to the live total, and — only for a returning reader
 * with something new — shows a one-line "N new dispatches" link into the feed.
 * A first-ever visit (nothing stored) and a caught-up reader both render
 * nothing. No fetch, no account, no server state: the live total comes in as a
 * prop (the home page already has stats.total).
 */
export function SinceLastVisit({ currentCount, en }: { currentCount: number; en: boolean }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Advance the reader's "last seen" baseline to the current total. The write
  // is deferred to a macrotask on purpose: right after hydration
  // useSyncExternalStore forces a second render to swap null → the real stored
  // value, and that render reads localStorage live. A synchronous write here
  // runs *before* that swap render (it's a later passive effect on the same
  // fiber) and would clobber the baseline, so the delta would always compute as
  // 0 and the strip would never appear. Deferring past the current commit lets
  // the swap render read the true prior value first, then we persist. We never
  // call setState in this effect — that trips react-hooks/set-state-in-effect.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, String(currentCount));
      } catch {
        /* storage unavailable (private mode / quota) — nothing to persist */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [currentCount]);

  // null → SSR / first client render, or a genuine first-ever visit: show
  // nothing (and let the effect above quietly record this visit's baseline).
  if (raw === null) return null;
  const lastSeen = Number(raw);
  if (!Number.isFinite(lastSeen)) return null; // corrupt value → treat as no signal
  const delta = currentCount - lastSeen;
  if (delta <= 0) return null; // nothing new since last visit (or count shrank)

  const noun = en ? (delta === 1 ? "new dispatch" : "new dispatches") : "yeni dispaç";

  return (
    <a
      href="#main"
      className="group flex w-full items-center gap-2.5 border border-hairline bg-surface-raised px-3 py-2 font-mono text-[length:var(--t-meta)] text-ink-secondary transition-colors hover:border-brand/50 hover:text-brand"
      style={{ borderRadius: "var(--radius-chip)" }}
    >
      <span aria-hidden className="signal-dot inline-block size-1.5 shrink-0 rounded-full bg-brand" />
      <span className="min-w-0 truncate">
        {en ? "Since your last visit:" : "Son girişindən:"}{" "}
        <b className="font-semibold text-ink-primary">{delta}</b> {noun}
      </span>
      <span aria-hidden className="ml-auto shrink-0 text-ink-muted transition-colors group-hover:text-brand">
        →
      </span>
    </a>
  );
}
