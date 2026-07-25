"use client";

import { useEffect, useState } from "react";

// Mounted once in the root layout, so it lives for the lifetime of a single
// full page load — Next's App Router keeps the root layout mounted across
// client-side <Link> navigation, meaning this only ever plays again on a real
// hard reload/new tab, never when clicking between pages. Server and client
// render the identical initial ("visible") state, so there's no hydration
// mismatch and no flash of real content before the splash appears.
export function IntroSplash() {
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduced ? 150 : 900;
    const fadeMs = reduced ? 0 : 350;

    const toHide = setTimeout(() => setPhase("hide"), holdMs);
    const toGone = setTimeout(() => {
      setPhase("gone");
      document.body.style.overflow = previousOverflow;
    }, holdMs + fadeMs);

    return () => {
      clearTimeout(toHide);
      clearTimeout(toGone);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface"
      style={{
        opacity: phase === "hide" ? 0 : 1,
        transition: phase === "hide" ? "opacity 350ms ease-out" : undefined,
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-ink-muted">
        təqdim edir
      </p>
      <p className="mt-2 font-headline italic text-3xl sm:text-4xl text-ink-primary">
        HackXana
      </p>
      <span className="intro-rule mt-5" />
    </div>
  );
}
