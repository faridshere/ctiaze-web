"use client";

import { useEffect, useState } from "react";

// "14 min ago", computed in the browser so an hourly-cached page never shows a
// stale relative time. Server-renders the absolute UTC stamp (honest even with
// JS off) and upgrades after mount; the absolute stamp stays as a title.
function relative(iso: string, nowMs: number): string {
  const m = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function utcStamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()]} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setText(relative(iso, Date.now()));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <time dateTime={iso} title={utcStamp(iso)}>
      {text ?? utcStamp(iso)}
    </time>
  );
}
