"use client";

import { useEffect } from "react";

/**
 * One site-wide motion controller (mounted once in the root layout).
 * Progressive enhancement: content is visible by default; we stamp
 * `motion-ok` on <html>, and only then [data-sc] elements arm (CSS) and
 * reveal when they enter the viewport. The reveal is marked with a data-in
 * ATTRIBUTE, never a class: React owns className on these nodes, so adding a
 * class here produced a hydration mismatch and could strip the reveal (leaving
 * content stuck at opacity 0) on the next re-render. Honors prefers-reduced-motion by
 * simply never arming. No per-element JS, one IntersectionObserver.
 *
 * Fail-safe (2026-10-16): an element that has not entered the viewport within
 * a few seconds of arming is revealed anyway. A reader who never scrolls loses
 * nothing, and an observer that misbehaves (embedded views, odd scroll
 * containers) can no longer leave a section of the paper blank.
 */
const FAILSAFE_MS = 6000;

export function MotionRoot() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    root.classList.add("motion-ok");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "";
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );

    const timers = new Set<number>();
    const arm = () => {
      document.querySelectorAll<HTMLElement>("[data-sc]:not([data-in]):not([data-armed])").forEach((el) => {
        el.dataset.armed = "";
        io.observe(el);
        const t = window.setTimeout(() => {
          if (!("in" in el.dataset)) {
            el.dataset.in = "";
            io.unobserve(el);
          }
          timers.delete(t);
        }, FAILSAFE_MS);
        timers.add(t);
      });
    };
    arm();

    // Re-arm after client-side navigations (App Router swaps DOM under us).
    const mo = new MutationObserver(arm);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      for (const t of timers) window.clearTimeout(t);
      root.classList.remove("motion-ok");
    };
  }, []);

  return null;
}
