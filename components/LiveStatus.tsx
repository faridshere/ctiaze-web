"use client";

import { useSyncExternalStore } from "react";
import { AZ_MONTHS } from "@/lib/format";

const TIME_ZONE = "Asia/Baku";

function computeNow(): string {
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
  return `bakı ${get("day")} ${month} · ${get("hour")}:${get("minute")}:${get("second")}`;
}

let cached = "";

// A ticking wall clock is external-to-React state by nature — useSyncExternalStore
// is the React-sanctioned way to subscribe to it (vs. setState-in-effect), and its
// getServerSnapshot keeps the server-rendered/ISR-cached HTML clock-free so a stale
// baked-in time is never shown before the client takes over.
function subscribe(onStoreChange: () => void) {
  cached = computeNow();
  const id = setInterval(() => {
    const next = computeNow();
    if (next !== cached) {
      cached = next;
      onStoreChange();
    }
  }, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  return cached;
}

function getServerSnapshot() {
  return "bakı";
}

export function LiveStatus() {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
      <span className="tabular-nums">{now}</span>
    </div>
  );
}
