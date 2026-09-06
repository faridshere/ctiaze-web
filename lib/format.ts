export const AZ_MONTHS = [
  "yan", "fev", "mar", "apr", "may", "iyun",
  "iyul", "avq", "sen", "okt", "noy", "dek",
];

// Serialize an object for a <script type="application/ld+json"> block. JSON.stringify
// does NOT escape '<', and the HTML tokenizer ends a <script> at the first "</script"
// regardless of JSON string context — so an upstream headline containing "</script>"
// (our titles come from scraped third-party feeds) would break out of the block and
// execute as markup. Escaping '<' (and '>' for symmetry) closes that hole; search
// engines parse the \u003c-escaped JSON identically.
export function jsonLdSafe(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

// Fixed timeZone so server and client render an identical string regardless of
// the visitor's local timezone — avoids hydration mismatches entirely.
const TIME_ZONE = "Asia/Baku";

const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatStoryDate(iso: string, locale: "az" | "en" = "az"): { time: string; date: string } {
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
  const month = (locale === "en" ? EN_MONTHS : AZ_MONTHS)[parseInt(get("month"), 10) - 1] ?? "";
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

const EN_MONTHS_FULL = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const EN_WEEKDAYS: Record<string, string> = {
  Mon: "MONDAY", Tue: "TUESDAY", Wed: "WEDNESDAY",
  Thu: "THURSDAY", Fri: "FRIDAY", Sat: "SATURDAY", Sun: "SUNDAY",
};

// "31 İYUL · CÜMƏ" (az) / "31 JULY · FRIDAY" (en) — the ledger date-divider label.
export function formatDayDivider(iso: string, locale: "az" | "en" = "az"): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, day: "2-digit", month: "numeric", weekday: "short",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const mi = parseInt(get("month"), 10) - 1;
  const month = (locale === "en" ? EN_MONTHS_FULL : AZ_MONTHS_FULL)[mi] ?? "";
  const wd = (locale === "en" ? EN_WEEKDAYS : AZ_WEEKDAYS)[get("weekday")] ?? "";
  return `${get("day")} ${month} · ${wd}`;
}

// ---------------------------------------------------------------------------
// Source feeds often publish a truncated description, so a story body can end
// mid-word ("…found no victim count or"). Rendering that verbatim reads as a
// broken scraper and undercuts the "grounded to source" claim — three separate
// reviewers flagged it as the worst thing about the content.
//
// Cut back to the last COMPLETE sentence instead, and only mark it with an
// ellipsis when something was actually dropped. Never adds words: the text
// still says exactly what the source said, it just stops at a full stop.
// ---------------------------------------------------------------------------
const SENTENCE_END = /[.!?](?=["'”’)\]]*(\s|$))/g;

// Syndication cruft that rides along in RSS descriptions. Measured across the
// published set: "The post … appeared first on <outlet>" on 58 stories, a literal
// "[...]" truncation marker on 56, Reddit's "submitted by /u/… [link] [comments]"
// on 10. Rendering it verbatim is what makes an automated wire look unattended.
const BOILERPLATE: RegExp[] = [
  /\s*The post\b[\s\S]*?\bappeared first on\b[^.]*\.?\s*$/i,
  /\s*submitted by\s+\/u\/\S+[\s\S]*$/i,
  /\s*\[link\]\s*\[comments\]\s*/gi,
  /\s*(Read more|Continue reading)\b[^.]*\.?\s*$/i,
];

/** Strip feed boilerplate. "[...]" marks where the publisher cut the text, so we
 *  cut there too and let completeSentences() end it honestly. */
export function stripBoilerplate(text: string): string {
  let out = (text || "").trim();
  for (const rx of BOILERPLATE) out = out.replace(rx, "");
  const marker = out.search(/\[\s*(\.\.\.|…)\s*\]/);
  if (marker > 0) out = out.slice(0, marker);
  return out.replace(/\s+/g, " ").trim();
}

export function completeSentences(text: string, opts: { min?: number } = {}): string {
  const s = stripBoilerplate(text);
  if (!s) return "";
  // Already ends cleanly (allowing a closing quote/bracket) — leave it alone.
  if (/[.!?]["'”’)\]]*$/.test(s)) return s;

  const min = opts.min ?? 80; // don't shrink a short body to almost nothing
  let cut = -1;
  for (const m of s.matchAll(SENTENCE_END)) cut = m.index + 1;

  // No sentence break, or cutting would leave too little: keep the text and end
  // it honestly with an ellipsis rather than pretending it is complete.
  if (cut < min) return `${s.replace(/[\s,;:—–-]+$/, "")}…`;
  return `${s.slice(0, cut)} …`;
}
