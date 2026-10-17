import { DotMap } from "@/components/actors/DotMap";
import { countryName } from "@/lib/geo";
import { DOSSIER_SECTION, LabelRun, Redacted, SectionHead } from "./ActorHeader";

const MAX_COUNTRY_CHIPS = 24;

// Where this actor has actually been observed, in two forms of the same data:
// the map (countries we can place on the grid) and the tags (everything a
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
  const originName = origin ? countryName(origin) ?? origin : null;

  return (
    <section className={DOSSIER_SECTION} aria-labelledby="targets-head">
      <SectionHead id="targets-head" aside={`${placed.length} countries · ${sectors.length} sectors`}>
        Observed targets (as stated by the sources)
      </SectionHead>
      <div className="grid gap-8 pt-5 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <div className="ink-box bg-paper-deep p-2 sm:p-3">
            <DotMap origin={origin} targets={placed} className="block aspect-[2/1] h-auto w-full" />
          </div>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="label inline-flex items-center gap-2 text-ink-3">
              <span aria-hidden className="inline-block size-2 border border-ink bg-paper-deep" />
              assessed origin{originName ? ` · ${originName}` : ""}
            </span>
            {!originName && <Redacted />}
            <span className="label inline-flex items-center gap-2 text-ink-3">
              <span aria-hidden className="inline-block size-2 bg-stamp" />
              observed targets · {placed.length}
            </span>
          </p>
        </div>

        <div className="md:col-span-5">
          {shownCountries.length > 0 && (
            <>
              <p className="label text-ink-3">countries · {placed.length}</p>
              <LabelRun
                className="mt-2"
                aria-label="Observed target countries"
                items={[
                  ...shownCountries.map((iso) => countryName(iso) ?? iso),
                  ...(restCountries > 0 ? [<span key="rest" className="num font-mono tracking-normal text-ink-3">+{restCountries}</span>] : []),
                ]}
              />
            </>
          )}
          {sectors.length > 0 && (
            <>
              <p className={`label text-ink-3 ${shownCountries.length > 0 ? "mt-5" : ""}`}>sectors · {sectors.length}</p>
              <LabelRun className="mt-2" aria-label="Observed target sectors" items={sectors} />
            </>
          )}
          {other.length > 0 && <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">also stated: {other.join(", ")}</p>}
          <p className="label mt-5 text-ink-3">as stated by MISP galaxy / ransomware.live — not inferred</p>
        </div>
      </div>
    </section>
  );
}
