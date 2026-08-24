"use client";

import { useSyncExternalStore } from "react";

type Saved = { slug: string; name: string };

const KEY = "ctiaze_sector";

// React-blessed way to read a client-only store (localStorage) without a
// setState-in-effect: SSR + hydration use the server snapshot (null → neutral
// prompt, so no hydration mismatch), then the client swaps to the real value.
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
 * Home personalization hook: once a reader picks their sector (on /sektor), we
 * remember it and surface a one-tap path back to their hub — "who targets us,
 * what to fix". No accounts, no server state.
 */
export function SectorRecall({ en }: { en: boolean }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let saved: Saved | null = null;
  if (raw) {
    try {
      const v = JSON.parse(raw) as Saved;
      if (v && typeof v.slug === "string" && typeof v.name === "string") saved = v;
    } catch {
      /* corrupt value → neutral prompt */
    }
  }

  const href = saved ? `/sektor/${saved.slug}` : "/sektor";
  const label = saved
    ? en
      ? "Your sector"
      : "Sənin sektorun"
    : en
      ? "Pick your sector"
      : "Sektorunu seç";

  return (
    <a
      href={href}
      className="mt-5 inline-flex items-center gap-2 border border-hairline bg-surface-raised px-3 py-1.5 font-mono text-[length:var(--t-meta)] text-ink-secondary transition-colors hover:border-brand/50 hover:text-brand"
      style={{ borderRadius: "var(--radius-chip)" }}
    >
      <span aria-hidden className="signal-dot inline-block size-1.5 rounded-full bg-brand" />
      {label}
      {saved ? <b className="font-semibold text-ink-primary">{saved.name}</b> : null}
      <span aria-hidden>→</span>
    </a>
  );
}
