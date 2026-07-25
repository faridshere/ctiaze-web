"use client";

import { useSyncExternalStore } from "react";

const THEME_EVENT = "ctiaze:theme-changed";

function getSnapshot(): "dark" | "light" {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "light" || current === "dark") return current;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

// The theme lives on <html data-theme> and in localStorage, both external to
// React — useSyncExternalStore reads it correctly on mount (no setState-in-effect)
// and re-syncs on our own toggle (via a same-page custom event) or an OS-level
// scheme change while no explicit choice has been saved.
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  mql.addEventListener("change", onStoreChange);
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => {
    mql.removeEventListener("change", onStoreChange);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
}

function getServerSnapshot(): "dark" | "light" {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="font-mono text-xs tracking-wide text-ink-muted hover:text-ink-primary transition-colors cursor-pointer px-2 py-1 -mx-2 border border-transparent hover:border-hairline rounded"
    >
      {theme === "dark" ? "☾ dark" : "☀ light"}
    </button>
  );
}
