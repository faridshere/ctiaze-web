"use client";

import { useSyncExternalStore } from "react";

// A timestamp shown in the READER's timezone.
//
// Every time on this site was formatted server-side in a fixed zone, which is
// correct and reproducible for the server but wrong for the person reading it:
// a visitor in Baku saw every dispatch stamped four hours earlier than it
// happened, with nothing on the page saying the times were not theirs.
//
// The server still renders the fixed-zone string, so the markup is identical on
// both sides and there is no hydration mismatch and no flash. Once mounted, the
// browser re-formats the same instant in its own zone. With JS off the reader
// keeps the server's string — and the `title` names the zone either way, so the
// number on screen is never unattributed.
//
// useSyncExternalStore rather than useEffect+setState: this project's lint
// forbids setting state in an effect, and the "have we hydrated yet" question
// is exactly what an external store subscription answers.
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export type TimeShape = "time" | "date" | "datetime";

function format(iso: string, shape: TimeShape): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const time: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  const date: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const opts =
    shape === "time" ? time : shape === "date" ? date : { ...date, ...time };
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}

function zoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time";
  } catch {
    return "your local time";
  }
}

export function LocalTime({
  iso,
  fallback,
  shape = "time",
  className = "",
}: {
  iso: string;
  /** What the server rendered — kept verbatim until hydration. */
  fallback: string;
  shape?: TimeShape;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);
  const local = hydrated ? format(iso, shape) : null;
  return (
    <time
      dateTime={iso}
      className={className}
      title={local ? `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC` : "UTC"}
      suppressHydrationWarning
    >
      {local ?? fallback}
    </time>
  );
}

// The zone the times on this page are actually in — for captions that used to
// hard-code "UTC" while <LocalTime> rendered the reader's zone right above them.
//
// Rendered as an offset ("UTC+4") rather than the IANA name ("Asia/Baku"): it is
// shorter, reads as a time zone to anyone anywhere, and — the reason it matters
// here — it degrades to exactly "UTC" at offset 0 and on the server, so the
// caption never changes shape between the two renders.
function utcOffsetLabel(): string {
  const mins = -new Date().getTimezoneOffset();
  if (mins === 0) return "UTC";
  const sign = mins > 0 ? "+" : "−"; // U+2212, not a hyphen — this is a minus
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function ZoneLabel({ className = "" }: { className?: string }) {
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);
  return (
    <span className={className} title={hydrated ? zoneName() : undefined} suppressHydrationWarning>
      {hydrated ? utcOffsetLabel() : "UTC"}
    </span>
  );
}

export { zoneName };
