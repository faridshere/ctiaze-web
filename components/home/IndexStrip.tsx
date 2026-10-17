import type { HomeData } from "@/lib/home-data";
import { Sparkline } from "./Sparkline";
import { AsOf } from "./AsOf";

// The index strip under the lead: four seven-day figures set in mono, the
// fortnight of daily counts as ink bars beside the first, and the source
// line that says exactly what was counted.
export function IndexStrip({ week, daily, asOf, refIso }: { week: HomeData["week"]; daily: HomeData["daily"]; asOf?: string | null; refIso?: string | null }) {
  const cells = [
    { label: "Dispatches · 7 days", value: week.dispatches },
    { label: "KEV · actively exploited", value: week.kev },
    { label: "With CVE ids", value: week.cves },
    { label: "Sources reporting", value: week.sources },
  ];
  return (
    <div data-sc>
      <div className="rule-2" />
      <dl className="cells grid-cols-2 md:grid-cols-4">
        {cells.map((c, i) => (
          <div key={c.label} className="flex flex-col justify-between gap-4 pb-4 pr-4 pt-3 odd:pl-0 even:pl-4 md:pl-4 md:first:pl-0">
            <dt className="label text-ink-3">{c.label}</dt>
            <dd className="flex items-end justify-between gap-3">
              <span className="num font-mono text-[2.5rem] leading-none text-ink md:text-[2.75rem]">{c.value.toLocaleString("en-US")}</span>
              {i === 0 && daily.length > 0 && <Sparkline data={daily} className="hidden h-9 w-[7rem] shrink-0 sm:block" />}
            </dd>
          </div>
        ))}
      </dl>
      <div className="rule-soft" />
      <p className="mt-3 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-3">
        Counted over the same published-story gate the pipeline uses before a dispatch reaches Telegram. Refreshed hourly. The bars are the last fourteen days, a day each.{" "}
        <AsOf iso={asOf} refIso={refIso} />
      </p>
    </div>
  );
}
