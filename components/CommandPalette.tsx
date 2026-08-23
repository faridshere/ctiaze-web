"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/lib/stories";
import { useLocale } from "./locale";
import { categoryName } from "@/lib/taxonomy";

export const PALETTE_OPEN_EVENT = "ctiaze:open-palette";

// Mounted once in the root layout so ⌘K works from any page. Opens on
// ⌘K/Ctrl+K (overriding the browser's own binding) or a custom window event
// dispatched by the header's trigger button — a single global boolean isn't
// worth a context provider.
export function CommandPalette() {
  const en = useLocale() === "en";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const LISTBOX_ID = "cmdk-listbox";
  const optId = (i: number) => `cmdk-opt-${i}`;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    previouslyFocused.current?.focus();
  }, []);

  const openPalette = useCallback(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  // Global open triggers: keyboard shortcut + header button event.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) return prev;
          previouslyFocused.current = document.activeElement as HTMLElement | null;
          return true;
        });
      }
    }
    function onOpenEvent() {
      openPalette();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(PALETTE_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(PALETTE_OPEN_EVENT, onOpenEvent);
    };
  }, [openPalette]);

  // Lazy-load the search index once, on first open.
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    fetch("/api/search-index", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then((data: SearchEntry[]) => setIndex(data))
      .catch(() => {
        loadedRef.current = false;
        setLoadError(true);
      });
  }, [open]);

  // Body scroll lock + focus while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(id);
    };
  }, [open]);

  const results = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 8);
    return index
      .filter(
        (entry) =>
          entry.titleAz.toLowerCase().includes(q) ||
          (entry.titleEn?.toLowerCase().includes(q) ?? false) ||
          entry.category.toLowerCase().includes(q) ||
          entry.cveIds.some((cve) => cve.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [index, query]);

  // Keep the arrow-selected option scrolled into view (it can slip out of the
  // max-h list — an SR/keyboard user would otherwise lose the highlight).
  useEffect(() => {
    if (!open) return;
    document.getElementById(optId(activeIndex))?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    // Focus trap: options are activedescendant-navigated (tabIndex -1), so the only
    // Tab stops are the input and the close button — cycle between them, never out.
    if (e.key === "Tab") {
      const first = inputRef.current, last = closeRef.current;
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const entry = results[activeIndex];
      if (entry) {
        close();
        router.push(`/xeber/${entry.slug}`);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4 bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={en ? "News search" : "Xəbər axtarışı"}
        className="w-full max-w-lg bg-surface-raised border border-hairline shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
          <span className="font-mono text-xs text-ink-muted" aria-hidden>
            ⌘K
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder={en ? "Search news, category or CVE…" : "Xəbər, kateqoriya və ya CVE axtar…"}
            className="flex-1 bg-transparent font-mono text-sm text-ink-primary placeholder:text-ink-muted outline-none"
            aria-label={en ? "Search" : "Axtarış"}
            role="combobox"
            aria-expanded
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={results[activeIndex] ? optId(activeIndex) : undefined}
          />
          <button
            ref={closeRef}
            onClick={close}
            aria-label={en ? "Close" : "Bağla"}
            className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink-primary transition-colors"
          >
            esc
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto overscroll-contain" role="listbox" id={LISTBOX_ID} aria-label={en ? "Search results" : "Axtarış nəticələri"}>
          {loadError && (
            <p role="alert" className="px-4 py-6 text-center font-mono text-xs text-ink-muted">
              {en ? "search failed to load — try again" : "axtarış yüklənmədi — yenidən cəhd edin"}
            </p>
          )}
          {!loadError && index === null && (
            <p role="status" className="px-4 py-6 text-center font-mono text-xs text-ink-muted">{en ? "loading…" : "yüklənir…"}</p>
          )}
          {!loadError && index !== null && results.length === 0 && (
            <p role="status" className="px-4 py-6 text-center font-mono text-xs text-ink-muted">
              {en ? "no results" : "nəticə tapılmadı"}
            </p>
          )}
          {results.map((entry, i) => (
            <button
              key={entry.slug}
              id={optId(i)}
              role="option"
              aria-selected={i === activeIndex}
              tabIndex={-1}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => {
                close();
                router.push(`/xeber/${entry.slug}`);
              }}
              className={`block w-full text-left px-4 py-3 border-b border-hairline last:border-b-0 transition-colors ${
                i === activeIndex ? "bg-surface" : ""
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <span>{categoryName(entry.category, en ? "en" : "az")}</span>
                {entry.cveIds[0] && <span>{entry.cveIds[0]}</span>}
              </div>
              <p className="mt-1 text-sm text-ink-primary truncate">{en ? entry.titleEn || entry.titleAz : entry.titleAz}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
