import type { ThreatActor } from "@/lib/threatactors";
import { DOSSIER_SECTION, Redacted, SectionHead } from "./ActorHeader";

function isoDay(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

// Whole months between two dates, floored at 1 so a crew observed inside a
// single month still yields a real (not divide-by-zero) monthly rate. Pure
// function of two given dates — no wall-clock read, safe to call from render.
function monthsBetween(first: Date, last: Date): number {
  const months =
    (last.getFullYear() - first.getFullYear()) * 12 +
    (last.getMonth() - first.getMonth());
  return Math.max(1, months);
}

type Figure = {
  key: string;
  label: string;
  value: React.ReactNode;
  /** right-aligned figure columns on the desktop table */
  right?: boolean;
  /** the count is set large; everything else at the table size */
  big?: boolean;
  tone?: string;
};

// Ransomware-crew figures, straight off the leak-site listings, set like a
// stock table: a count, two dates and a derived rate, nothing modeled. The
// 30-day column is the tracker's own count against the lifetime monthly
// average: above it is worse (the crew is posting faster), below is better.
// On the desktop it is a real one-row table; under 640px the same five
// figures reflow into ruled cells (label above, figure below) so nothing sits
// off-screen in a scroller the footnote then describes.
// Renders only for a crime actor with an actual victim count; a nation-state
// or a name-only stub gets none of this, honestly.
export function ActorVictims({
  actor,
}: {
  actor: Pick<
    ThreatActor,
    "type" | "victim_count" | "first_seen" | "last_active" | "activity_30d"
  >;
}) {
  const victims = actor.victim_count ?? 0;
  if (actor.type !== "crime" || victims <= 0) return null;

  const first = actor.first_seen ? new Date(actor.first_seen) : null;
  const last = actor.last_active ? new Date(actor.last_active) : null;
  const firstOk = !!first && !Number.isNaN(first.getTime());
  const lastOk = !!last && !Number.isNaN(last.getTime());
  const velocity =
    firstOk && lastOk ? victims / monthsBetween(first!, last!) : null;
  const last30 =
    actor.activity_30d && actor.activity_30d.victims > 0
      ? actor.activity_30d.victims
      : null;
  const delta = last30 != null && velocity != null ? last30 - velocity : null;
  const deltaTone =
    delta != null && delta > 0
      ? "text-worse"
      : delta != null && delta < 0
        ? "text-better"
        : "text-ink";

  const figures: Figure[] = [
    {
      key: "count",
      label: "Victims observed",
      value: victims.toLocaleString("en-US"),
      big: true,
    },
    {
      key: "first",
      label: "First observed",
      value: firstOk ? (
        <time dateTime={isoDay(actor.first_seen)!}>
          {isoDay(actor.first_seen)}
        </time>
      ) : (
        <Redacted />
      ),
    },
    {
      key: "last",
      label: "Last observed on leak site",
      value: lastOk ? (
        <time dateTime={isoDay(actor.last_active)!}>
          {isoDay(actor.last_active)}
        </time>
      ) : (
        <Redacted />
      ),
    },
    {
      key: "rate",
      label: "Lifetime rate",
      value:
        velocity != null ? `≈ ${velocity.toFixed(1)} / month` : <Redacted />,
      right: true,
    },
  ];
  if (last30 != null) {
    figures.push({
      key: "last30",
      label: "Last 30 days",
      right: true,
      tone: deltaTone,
      value: (
        <>
          {delta != null && delta !== 0 && (
            <>
              <span aria-hidden>{delta > 0 ? "▲" : "▼"}</span>
              <span className="sr-only">
                {delta > 0 ? "above" : "below"} the lifetime rate
              </span>{" "}
            </>
          )}
          {last30.toLocaleString("en-US")}
        </>
      ),
    });
  }

  return (
    <section className={DOSSIER_SECTION} aria-labelledby="victims-head">
      <SectionHead
        id="victims-head"
        aside="leak-site listings via ransomware.live"
      >
        Victims
      </SectionHead>

      {/* ≥640px: the stock table. The switch lives on wrapper divs because
          .cells sets display itself (unlayered) and would beat a sm:hidden on the dl. */}
      <div className="hidden sm:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Leak-site victim figures</caption>
          <thead>
            <tr>
              {figures.map((f) => (
                <th
                  key={f.key}
                  scope="col"
                  className={`label border-b border-rule-soft py-1.5 text-ink-3 ${f.right ? "text-right" : "text-left"}`}
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule-soft align-baseline">
              {figures.map((f) => (
                <td
                  key={f.key}
                  className={`num whitespace-nowrap py-3 font-mono ${f.big ? "text-[2rem] leading-none" : "text-[14px]"} ${f.right ? "pl-4 text-right" : "pr-4"} ${f.tone ?? "text-ink"}`}
                >
                  {f.value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Under 640px: the same figures as ruled cells, two to a row, nothing off-screen. */}
      <div className="mt-3 sm:hidden">
        <dl className="cells grid-cols-2 border-y border-ink">
          {figures.map((f) => (
            <div
              key={f.key}
              // The count takes a full row only when that leaves an even grid below
              // it; an odd count would otherwise print one solid ink hole at the end.
              className={`flex flex-col justify-between gap-2 px-3 py-3 ${figures.length % 2 === 1 ? "first:col-span-2" : ""}`}
            >
              <dt className="label text-ink-3">{f.label}</dt>
              <dd
                className={`num font-mono ${f.big ? "text-[2rem] leading-none" : "text-[14px]"} ${f.tone ?? "text-ink"}`}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="label mt-3 text-ink-3">
        lifetime rate = victims ÷ months from first to last observed · ▲ above
        that rate is worse · a quiet leak site says nothing about the crew
      </p>
    </section>
  );
}
