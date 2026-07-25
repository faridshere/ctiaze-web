"use client";

import { useEffect, useState } from "react";
import { AZ_MONTHS } from "@/lib/format";

const TIME_ZONE = "Asia/Baku";

function bakuNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "numeric",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = AZ_MONTHS[parseInt(get("month"), 10) - 1] ?? "";
  return {
    clock: `${get("hour")}:${get("minute")}:${get("second")}`,
    date: `${get("day")} ${month}`,
  };
}

// Ticks client-side only — rendering nothing until mount avoids a
// server/client clock mismatch instead of fighting it with suppressHydrationWarning.
export function LiveStatus() {
  const [now, setNow] = useState<{ clock: string; date: string } | null>(null);

  useEffect(() => {
    setNow(bakuNow());
    const id = setInterval(() => setNow(bakuNow()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
      <span className="inline-flex items-center gap-1.5 text-accent-good">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
        </span>
        canlı
      </span>
      <span className="text-hairline">·</span>
      <span className="tabular-nums">
        {now ? `bakı ${now.date} · ${now.clock}` : "bakı"}
      </span>
    </div>
  );
}
