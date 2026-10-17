import { utcStamp } from "@/lib/stack/example";

// A module's freshness stamp: when its OWN data was read, never the render
// time. A last-good copy served during an outage keeps its original time, and
// a stamp from an earlier UTC day than `ref` prints its date as well.
export function AsOf({ iso, refIso, className = "" }: { iso: string | null | undefined; refIso?: string | null; className?: string }) {
  const stamp = utcStamp(iso, refIso);
  if (!stamp) return null;
  return (
    <span className={`num font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 ${className}`} data-asof>
      as of <time dateTime={iso!}>{stamp}</time>
    </span>
  );
}
