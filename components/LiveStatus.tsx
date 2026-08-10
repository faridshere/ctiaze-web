"use client";

import { useSyncExternalStore } from "react";
import { AZ_MONTHS } from "@/lib/format";
import { useLocale } from "./locale";

const TIME_ZONE = "Asia/Baku";
const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Locale-independent tick: "day\tmonthIndex\thh:mm:ss" — the component formats the
// month name per locale, so the external store stays pure (no module mutation).
function computeNow(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, day: "2-digit", month: "numeric",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}\t${parseInt(get("month"), 10) - 1}\t${get("hour")}:${get("minute")}:${get("second")}`;
}

let cached = "";

function subscribe(onStoreChange: () => void) {
  cached = computeNow();
  const id = setInterval(() => {
    const next = computeNow();
    if (next !== cached) { cached = next; onStoreChange(); }
  }, 1000);
  return () => clearInterval(id);
}
function getSnapshot() {
  return cached;
}
function getServerSnapshot() {
  return "";
}

export function LiveStatus() {
  const en = useLocale() === "en";
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prefix = en ? "baku" : "bakı";

  let tail = "";
  if (raw) {
    const [day, mi, time] = raw.split("\t");
    const month = (en ? EN_MONTHS : AZ_MONTHS)[Number(mi)] ?? "";
    tail = ` ${day} ${month} · ${time}`;
  }

  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted tabular-nums">
      {prefix}{tail}
    </span>
  );
}
