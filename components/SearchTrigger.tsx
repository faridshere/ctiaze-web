"use client";

import { PALETTE_OPEN_EVENT } from "./CommandPalette";

export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(PALETTE_OPEN_EVENT))}
      className="font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
      aria-label="Axtarışı aç"
    >
      <span className="hidden sm:inline">axtar </span>
      <span className="text-ink-muted/70">⌘K</span>
    </button>
  );
}
