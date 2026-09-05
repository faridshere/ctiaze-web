"use client";

import { useEffect, useState } from "react";

// A ticking UTC clock for the wire panel's title bar. Renders a fixed-width
// placeholder on the server and starts ticking after mount, so server and
// client markup agree (no hydration mismatch) and nothing shifts.
function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export function UtcClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(stamp(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-block w-[8ch] font-mono text-[11px] tabular-nums tracking-[0.06em] text-ink-muted" aria-live="off">
      {now ?? "--:--:--"}
    </span>
  );
}
