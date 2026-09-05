import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import { DotMap } from "@/components/actors/DotMap";
import { countryName } from "@/lib/geo";

const MAX_COUNTRY_CHIPS = 24;

// Where this actor has actually been observed, in two forms of the same data:
// the map (countries we can place on the grid) and the text (everything a
// source stated — including non-country targets like "NATO" or a named firm
// that never gets a dot). Nothing here is inferred targeting; it is what
// MISP galaxy / ransomware.live recorded.
export function ActorTargets({
  origin,
  placed,
  other,
  sectors,
}: {
  /** ISO-2 assessed origin, or null when the source states none */
  origin: string | null;
  /** ISO-2 target countries the map can place */
  placed: string[];
  /** stated targets that are not countries (orgs, alliances, companies) */
  other: string[];
  sectors: string[];
}) {
  if (placed.length + other.length + sectors.length === 0) return null;
  const shownCountries = placed.slice(0, MAX_COUNTRY_CHIPS);
  const restCountries = placed.length - shownCountries.length;

  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          <Panel tone="void" className="aspect-[2/1] w-full">
            <DotMap origin={origin} targets={placed} className="h-full w-full" />
          </Panel>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-brand" />
              assessed origin
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-limb" />
              observed targets ({placed.length})
            </span>
          </p>
        </div>
        <div>
          <Kicker>Observed targets</Kicker>
          {shownCountries.length > 0 && (
            <>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">countries · {placed.length}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
              {shownCountries.map((iso) => (
                <span
                  key={iso}
                  className="rounded-[var(--radius-chip)] border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink-secondary"
                >
                  {countryName(iso) ?? iso}
                </span>
              ))}
              {restCountries > 0 && (
                <span className="px-1 py-0.5 font-mono text-[11px] text-ink-muted">+{restCountries}</span>
              )}
              </div>
            </>
          )}
          {sectors.length > 0 && (
            <>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">sectors · {sectors.length}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
              {sectors.map((s) => (
                <span
                  key={s}
                  className="rounded-[var(--radius-chip)] border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink-secondary"
                >
                  {s}
                </span>
              ))}
              </div>
            </>
          )}
          {other.length > 0 && (
            <p className="mt-4 text-[13px] leading-relaxed text-ink-secondary">also stated: {other.join(", ")}</p>
          )}
          <p className="mt-4 font-mono text-[11px] text-ink-muted">
            as stated by MISP galaxy / ransomware.live — not inferred
          </p>
        </div>
      </div>
    </section>
  );
}
