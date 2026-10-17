"use client";

import { useEffect, useState } from "react";

// The ticking clock in the tape and the strip. UTC, labelled, because the
// paper's datelines are UTC: every reader anywhere can check it against the
// instant a dispatch carries. Renders a fixed-width placeholder on the server
// and starts ticking after mount, so server and client markup agree and
// nothing shifts.
function stamp(d: Date, seconds: boolean): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}${seconds ? `:${p(d.getUTCSeconds())}` : ""}`;
}

export function UtcClock({ className = "", seconds = false, fallbackIso }: { className?: string; seconds?: boolean; fallbackIso?: string }) {
  const [now, setNow] = useState<string | null>(null);
  const fallback = fallbackIso ? stamp(new Date(fallbackIso), seconds) : seconds ? "--:--:--" : "--:--";
  useEffect(() => {
    const tick = () => setNow(stamp(new Date(), seconds));
    tick();
    const id = setInterval(tick, seconds ? 1000 : 15_000);
    return () => clearInterval(id);
  }, [seconds]);
  return (
    <span
      className={`num inline-block whitespace-nowrap font-mono text-[11px] tracking-[0.06em] ${className}`}
      aria-live="off"
      title="Coordinated Universal Time"
      data-utc-clock
    >
      {now ?? fallback} UTC
    </span>
  );
}
