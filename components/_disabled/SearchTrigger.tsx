"use client";

import { useSyncExternalStore } from "react";
import { PALETTE_OPEN_EVENT } from "./CommandPalette";
import { useLocale } from "./locale";

// The platform-correct shortcut (⌘K on Mac, Ctrl K elsewhere) is client-only.
// useSyncExternalStore is the sanctioned way to read it without a
// setState-in-effect: server renders no glyph, client fills it in on mount.
function subscribe() {
  return () => {};
}
function getSnapshot(): string {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K";
}
function getServerSnapshot(): string | null {
  return null;
}

export function SearchTrigger() {
  const mod = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const en = useLocale() === "en";

  return (
    <button
      onClick={() => window.dispatchEvent(new Event(PALETTE_OPEN_EVENT))}
      className="font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
      aria-label={en ? "Open search" : "Axtarışı aç"}
    >
      <span>{en ? "search" : "axtar"}</span>
      {mod && <span className="ml-1.5 hidden text-ink-muted/70 md:inline">{mod}</span>}
    </button>
  );
}
