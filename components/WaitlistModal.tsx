"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Waitlist } from "@/components/Waitlist";

const SEEN_KEY = "skopnix.waitlist.seen";       // shown once — never nag twice
const DONE_KEY = "skopnix.waitlist.done";       // actually signed up — never show again

// Fired by a tool once the visitor has a REAL result in hand.
export const VALUE_EVENT = "skopnix:value-moment";
export type ValueMoment = { subject?: string; kind?: "domain" | "email" | "actor" };

export function announceValueMoment(detail: ValueMoment) {
  try {
    window.dispatchEvent(new CustomEvent(VALUE_EVENT, { detail }));
  } catch {
    /* SSR / unsupported */
  }
}

// Early-access capture, shown at the ONE moment it isn't an interruption: right
// after the visitor got the answer they came for. Deliberately not a timer — a
// time-delayed modal fires mid-scan, is the worst-converting trigger class, and
// is the format users report hating most. Once per visitor, ever.
export function WaitlistModal({ source }: { source: string }) {
  const [open, setOpen] = useState(false);
  const [moment, setMoment] = useState<ValueMoment>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const pressedInside = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    restoreTo.current?.focus?.();
  }, []);

  useEffect(() => {
    function onValue(e: Event) {
      let seen = true;
      try {
        seen = localStorage.getItem(SEEN_KEY) === "1" || localStorage.getItem(DONE_KEY) === "1";
      } catch {
        seen = false; // private mode: allow one, it won't persist
      }
      if (seen) return;
      // Don't burn the single lifetime impression on a background tab.
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const detail = (e as CustomEvent<ValueMoment>).detail || {};
      restoreTo.current = (document.activeElement as HTMLElement) ?? null;
      setMoment(detail);
      setOpen(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* private mode */
      }
    }
    window.addEventListener(VALUE_EVENT, onValue);
    return () => window.removeEventListener(VALUE_EVENT, onValue);
  }, []);

  // Focus the dialog, trap Tab inside it, close on Escape, lock body scroll.
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    // Defer a frame: the tool that triggered us also moves focus to its fresh
    // result in its own effect, and that effect runs after ours. Without the
    // deferral the result steals focus straight back and keyboard users land
    // outside the dialog that just covered the page.
    const focusTimer = setTimeout(() => node?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  const subject = moment.subject?.slice(0, 40);
  const heading = subject ? `Want ${subject} watched?` : "Want the keys?";
  const blurb =
    moment.kind === "email"
      ? "Continuous monitoring is opening soon — we'll tell you if this address turns up in a new breach."
      : moment.kind === "actor"
        ? "Continuous monitoring is opening soon — new activity from the groups you follow, as it lands."
        : subject
          ? "Continuous monitoring is opening soon — a new subdomain, a new lookalike, a newly open port."
          : "More tools, deeper data, and your own login when it opens.";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        pressedInside.current = e.target !== e.currentTarget;
      }}
      onClick={(e) => {
        // Only dismiss on a click that BEGAN on the backdrop — otherwise
        // selecting text inside and releasing outside would close the dialog.
        if (e.target === e.currentTarget && !pressedInside.current) close();
        pressedInside.current = false;
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skx-waitlist-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] outline-none sm:p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-2 top-2 grid size-11 place-items-center rounded-sm text-ink-muted transition-colors hover:text-ink-primary"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">Early access</p>
        <h2 id="skx-waitlist-title" className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-ink-primary">
          {heading}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
          {blurb} Drop your email to get in <b className="font-medium text-ink-primary">free, first</b>.
        </p>
        <div className="mt-5">
          <Waitlist source={`${source}:modal`} compact />
        </div>
      </div>
    </div>
  );
}
