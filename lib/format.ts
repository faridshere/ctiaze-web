const AZ_MONTHS = [
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
