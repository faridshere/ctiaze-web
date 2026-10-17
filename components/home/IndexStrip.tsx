import type { HomeData } from "@/lib/home-data";
import { outageSpan, outagesIn } from "@/lib/outages";
import { Sparkline } from "./Sparkline";

// The index strip under the lead: four seven-day figures set in mono, the
// fortnight of daily counts as ink bars beside the first, and the source
// line that says exactly what was counted. A day the pipeline was down still
// prints its real zero; one line under the source line says so while that
// outage is inside the fourteen days (lib/outages.ts).
export function IndexStrip({ week, daily }: { week: HomeData["week"]; daily: HomeData["daily"] }) {
  const outages = outagesIn(daily.map((d) => d.day));
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
        Counted over the same published-story gate the pipeline uses before a dispatch reaches Telegram. Refreshed hourly. The bars are the last fourteen days, a day each.
      </p>
      {outages.map((o) => (
        <p key={o.from} className="mt-1 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-2" data-outage>
          <span className="num font-mono">{outageSpan(o)}</span> reads zero: our {o.what}, not a quiet wire.
        </p>
      ))}
    </div>
  );
}
