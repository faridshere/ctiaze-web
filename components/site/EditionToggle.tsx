"use client";

// DAY / NIGHT: the masthead's edition switch. The choice lives in localStorage
// and is applied as data-edition on <html>; the root layout's inline script
// replays it before first paint, so there is no flash and no cookie (every
// page stays ISR). With nothing stored, prefers-color-scheme decides.
//
// The control's label is chosen by CSS, not by JS (globals.css .ed-day /
// .ed-night), so it is right before hydration and without JavaScript; the
// click handler is the only client behaviour.
const KEY = "skopnix.edition";

function current(): "day" | "night" {
  const set = document.documentElement.getAttribute("data-edition");
  if (set === "day" || set === "night") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

export function EditionToggle({ className = "" }: { className?: string }) {
  function flip() {
    const next = current() === "day" ? "night" : "day";
    document.documentElement.setAttribute("data-edition", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the attribute still holds for this page */
    }
  }

  return (
    <button
      type="button"
      onClick={flip}
      className={`label inline-flex items-center gap-2 text-ink-3 transition-colors hover:text-ink ${className}`}
      aria-label="Switch between the day and night editions"
    >
      <span aria-hidden className="ed-box inline-block size-[9px] border border-current" />
      <span className="ed-day">Day edition</span>
      <span className="ed-night">Night edition</span>
    </button>
  );
}
