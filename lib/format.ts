export const AZ_MONTHS = [
  "yan", "fev", "mar", "apr", "may", "iyun",
  "iyul", "avq", "sen", "okt", "noy", "dek",
];

// Fixed timeZone so server and client render an identical string regardless of
// the visitor's local timezone — avoids hydration mismatches entirely.
const TIME_ZONE = "Asia/Baku";

export function formatStoryDate(iso: string): { time: string; date: string } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = AZ_MONTHS[parseInt(get("month"), 10) - 1] ?? "";
  return {
    time: `${get("hour")}:${get("minute")}`,
    date: `${get("day")} ${month}`,
  };
}

// --- Ledger day-dividers (Baku-pinned, so server/client group identically) ---
const AZ_MONTHS_FULL = [
  "YANVAR", "FEVRAL", "MART", "APREL", "MAY", "İYUN",
  "İYUL", "AVQUST", "SENTYABR", "OKTYABR", "NOYABR", "DEKABR",
];
const AZ_WEEKDAYS: Record<string, string> = {
  Mon: "BAZAR ERTƏSİ", Tue: "ÇƏRŞƏNBƏ AXŞAMI", Wed: "ÇƏRŞƏNBƏ",
  Thu: "CÜMƏ AXŞAMI", Fri: "CÜMƏ", Sat: "ŞƏNBƏ", Sun: "BAZAR",
};

// Stable YYYY-MM-DD grouping key in Baku time.
export function bakuDayKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// "31 İYUL · CÜMƏ" — the ledger date-divider label.
export function formatDayDivider(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, day: "2-digit", month: "numeric", weekday: "short",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = AZ_MONTHS_FULL[parseInt(get("month"), 10) - 1] ?? "";
  return `${get("day")} ${month} · ${AZ_WEEKDAYS[get("weekday")] ?? ""}`;
}
