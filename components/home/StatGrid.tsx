import type { HomeData } from "@/lib/home-data";
import { CountUp } from "./CountUp";

// Four real seven-day counts in a crosshair grid — the `+` marks where a
// column divider meets the top and bottom rules (xintra's logo-wall motif),
// spent here on numbers we can stand behind instead of on logos we don't have.
// Two columns on phones, four on desktop; the middle divider only exists on
// desktop, so its marks are md-only. The numbers tick up once, on first view.
export function StatGrid({ week }: { week: HomeData["week"] }) {
  const cells = [
    { label: "dispatches · 7d", value: week.dispatches },
    { label: "KEV · actively exploited", value: week.kev },
    { label: "with CVE ids", value: week.cves },
    { label: "sources reporting", value: week.sources },
  ];
  return (
    <dl className="grid grid-cols-2 border-t border-hairline md:grid-cols-4">
      {cells.map((c, i) => {
        const divider = i === 1 || i === 3 ? "" : i === 2 ? "hidden md:block" : "hidden";
        return (
          <div
            key={c.label}
            className={`relative border-b border-hairline px-4 py-7 sm:px-6 sm:py-9 ${i % 2 === 1 ? "border-l" : ""} ${i === 2 ? "md:border-l" : ""}`}
          >
            <span aria-hidden className={`crosshair absolute left-0 top-0 ${divider}`} />
            <span aria-hidden className={`crosshair absolute bottom-0 left-0 ${divider}`} />
            <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">{c.label}</dt>
            <dd className="mt-3 font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold leading-none tracking-[-0.04em] text-ink-primary">
              <CountUp value={c.value} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
