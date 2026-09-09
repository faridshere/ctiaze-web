"use client";

import { useEffect, useState } from "react";
import { zoneName } from "@/components/site/LocalTime";

// The ticking clock in the wire panel's title bar. Renders a fixed-width
// placeholder on the server and starts ticking after mount, so server and client
// markup agree (no hydration mismatch) and nothing shifts.
//
// It used to tick in UTC while every dispatch row beneath it rendered in the
// READER's zone (components/site/LocalTime). In Baku that put "19:52" in the
// title bar above a column of rows stamped "23:04" — the wire appeared to be
// four hours ahead of the site's own clock. Both now read the same zone, and
// the zone is named rather than assumed.
function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
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
    <span
      className="inline-block w-[8ch] font-mono text-[11px] tabular-nums tracking-[0.06em] text-ink-muted"
      aria-live="off"
      title={now ? zoneName() : undefined}
    >
      {now ?? "--:--:--"}
    </span>
  );
}
