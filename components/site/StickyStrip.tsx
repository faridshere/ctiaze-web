"use client";

import { useEffect, useRef, useState } from "react";

// The front page's nameplate is not sticky; once it has scrolled off, this
// compact strip slides in from the top so the wordmark, the sections and the
// clock stay in reach. It watches a sentinel placed under the nameplate and
// never measures scroll on every frame.
export function StickyStrip({ children }: { children: React.ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      <div
        className="fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-[var(--ease-out)]"
        style={{ transform: shown ? "none" : "translateY(-110%)" }}
        aria-hidden={!shown}
        inert={!shown}
      >
        {children}
      </div>
    </>
  );
}
