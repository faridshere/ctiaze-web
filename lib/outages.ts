// Days the pipeline itself was down, so a chart of our own output reads zero
// for a reason that is ours, not the news. The counts are never smoothed or
// filled in: the chart prints the real zeros and this list says why. Dates are
// UTC days, inclusive. Add a row only for an outage that really happened.
export type Outage = { from: string; to: string; what: string };

export const OUTAGES: Outage[] = [
  // Ingestion stopped 11 Oct and resumed 16 Oct (the Atlas outage the
  // snapshot fallback in lib/snapshot.ts was written for).
  { from: "2026-10-11", to: "2026-10-15", what: "ingestion outage" },
];

/** The outages that fall inside a run of ISO days (the chart's window). */
export function outagesIn(days: string[], list: Outage[] = OUTAGES): Outage[] {
  if (days.length === 0) return [];
  const first = days[0];
  const last = days[days.length - 1];
  return list.filter((o) => o.from <= last && o.to >= first);
}

/** The outage covering one ISO day, if any. */
export function outageOn(day: string, list: Outage[] = OUTAGES): Outage | null {
  return list.find((o) => o.from <= day && day <= o.to) ?? null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "11–15 Oct", or "28 Sep–2 Oct" across a month. */
export function outageSpan(o: Outage): string {
  const [, fm, fd] = o.from.split("-").map(Number);
  const [, tm, td] = o.to.split("-").map(Number);
  if (o.from === o.to) return `${fd} ${MONTHS[fm - 1]}`;
  return fm === tm ? `${fd}–${td} ${MONTHS[tm - 1]}` : `${fd} ${MONTHS[fm - 1]}–${td} ${MONTHS[tm - 1]}`;
}
