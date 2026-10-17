import Link from "next/link";
import type { OriginGroup } from "@/lib/threatactors";

// The ten countries the roster assesses the most adversaries to, as a ruled
// table: ISO, country, count, the three best-documented names. Each line is a
// real filter link (?origin=ISO), read by ActorSearch on mount so a click
// lands the visitor on the roster already filtered, not on a highlighted card.
// Two inks only: the mono ISO code and the underlined country name identify
// the row; no flags (the paper prints no emoji icons).
export function OriginStrip({ origins }: { origins: OriginGroup[] }) {
  if (origins.length === 0) return null;
  const total = origins.reduce((s, o) => s + o.count, 0);
  return (
    <section data-sc aria-labelledby="origin-head">
      <div className="rule-2" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-5">
        <h2 id="origin-head" className="headline text-[clamp(1.6rem,3vw,2.4rem)] text-ink">
          By assessed origin
        </h2>
        <p className="label text-ink-3">
          ten most assessed · <span className="num font-mono tracking-normal">{total.toLocaleString("en-US")}</span> dossiers · as stated by the
          sources
        </p>
      </div>
      <table className="mt-5 w-full border-collapse">
        <caption className="sr-only">Adversary dossiers by assessed origin country, ten largest, each a link to the filtered roster</caption>
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className="label w-[4rem] py-2 pr-3 text-left text-ink-3">
              ISO
            </th>
            <th scope="col" className="label py-2 pr-3 text-left text-ink-3 sm:w-[14rem]">
              Country
            </th>
            <th scope="col" className="label w-[5.5rem] py-2 pr-3 text-right text-ink-3">
              Dossiers
            </th>
            <th scope="col" className="label hidden w-full py-2 text-left text-ink-3 sm:table-cell">
              Lead adversaries
            </th>
          </tr>
        </thead>
        <tbody>
          {origins.map((o) => (
            <tr key={o.iso} className="group border-b border-rule-soft">
              <td className="num whitespace-nowrap py-2.5 pr-3 font-mono text-[12px] text-ink-3">{o.iso}</td>
              <td className="whitespace-nowrap py-2.5 pr-3">
                <Link href={`/actors?origin=${o.iso}`} className="ulink text-[15px] text-ink">
                  {o.name}
                </Link>
              </td>
              <td className="num py-2.5 pr-3 text-right font-mono text-[15px] text-ink">{o.count.toLocaleString("en-US")}</td>
              <td className="hidden max-w-0 truncate py-2.5 text-[13px] text-ink-2 sm:table-cell" title={o.lead.join(", ")}>
                {o.lead.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
