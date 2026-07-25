"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function getSnapshot() {
  return window.matchMedia("(pointer: fine)").matches;
}

function getServerSnapshot() {
  return false;
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

// A decorative targeting-reticle that trails the cursor over story links —
// never replaces the native cursor (pointer-events: none, always additive),
// so nothing about click/hover/focus behavior anywhere else can break. Absent
// entirely on touch devices, detected via useSyncExternalStore so the
// server/hydration render (no pointer, no window) never mismatches the
// client's eventual real capability.
export function CustomCursor() {
  const supported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;

    function onMove(e: MouseEvent) {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`;
      }
      const target = (e.target as HTMLElement)?.closest?.('a[href^="/xeber/"]');
      setActive(Boolean(target));
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [supported]);

  if (!supported) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[80] size-8 -translate-x-full -translate-y-full transition-opacity duration-150"
      style={{ opacity: active ? 1 : 0 }}
    >
      <svg viewBox="0 0 32 32" className="size-full text-accent-critical">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
          <path d="M2 10V2h8" />
          <path d="M22 2h8v8" />
          <path d="M30 22v8h-8" />
          <path d="M10 30H2v-8" />
        </g>
      </svg>
    </div>
  );
}
