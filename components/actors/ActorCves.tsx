import Link from "next/link";
import type { ActorCve } from "@/lib/threatactors";
import {
  buildDossierCves,
  dossierCitedHeading,
  relationsIn,
  type CveActorCitationDoc,
  type DossierCve,
} from "@/lib/citations";
import { EvidenceList } from "@/components/citations/EvidenceList";
import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

// The CVEs tied to this adversary, in two kinds that are never mixed:
//
//   • cited — a source (a report, or one of our dispatches) is quoted tying the
//     actor to the flaw. Each such CVE prints its quotes and their source links
//     (lib/citations.ts drops any citation missing either), and the wording is
//     "cited as …" from the relations present, never "confirmed" or a bare
//     "exploits".
//   • named alongside — our dispatches named both, with no quote tying them.
//     A story can name a group and a flaw without the group having used the
//     flaw, so these stay "named alongside", as they always were.
const pct = (e: number) => `${(e * 100).toFixed(e >= 0.1 ? 0 : 1)}%`;

function CveLink({ cve }: { cve: string }) {
  return (
    <Link href={`/cve/${cve}`} className="num font-mono text-[13px] text-ink underline-offset-[3px] hover:underline">
      {cve}
    </Link>
  );
}

function CitedRow({ c }: { c: DossierCve }) {
  return (
    <li className="row py-3" data-sev={c.kev ? "kev" : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-3">
          <CveLink cve={c.cve} />
          {c.kev && <span className="stamp">KEV</span>}
        </span>
        <span className="num font-mono text-[12px] text-ink-3">
          {c.epss != null ? `EPSS ${pct(c.epss)}` : ""}
          {c.epss != null && c.date ? " · " : ""}
          {c.date ? c.date.slice(0, 10) : ""}
        </span>
      </div>
      <EvidenceList evidence={c.evidence} more={c.moreEvidence} />
    </li>
  );
}

export function ActorCves({
  cves,
  citations,
  storySlugs,
  actorName,
}: {
  cves: ActorCve[] | null | undefined;
  citations?: CveActorCitationDoc[] | null;
  storySlugs?: ReadonlyMap<string, string>;
  actorName: string;
}) {
  const { cited, named } = buildDossierCves(cves, citations, storySlugs);
  if (cited.length === 0 && named.length === 0) return null;
  const kevCount = [...cited, ...named].filter((r) => r.kev).length;
  const aside = kevCount > 0 ? `${kevCount} on CISA KEV` : "none on KEV";

  return (
    <section className={DOSSIER_SECTION} aria-labelledby="cves-head">
      <SectionHead id="cves-head" aside={aside}>
        {cited.length > 0 ? (
          dossierCitedHeading(relationsIn(cited.map((c) => c.evidence)), actorName)
        ) : (
          <>CVEs named alongside {actorName}</>
        )}
      </SectionHead>

      {cited.length > 0 && (
        <>
          <ol>
            {cited.map((c) => (
              <CitedRow key={c.cve} c={c} />
            ))}
          </ol>
          <p className="mt-3 max-w-[64ch] text-[13px] leading-relaxed text-ink-3">
            Each line is what a source says, quoted, with the source linked under it. A citation is a source&apos;s claim,
            not our confirmation: read the source before you act on it.
          </p>
        </>
      )}

      {named.length > 0 && (
        <div className={cited.length > 0 ? "mt-8" : ""}>
          {cited.length > 0 && <h3 className="label mb-1 text-ink">Named alongside {actorName} only</h3>}
          <table className="w-full border-collapse">
            <caption className="sr-only">CVEs named in the same dispatches as {actorName}</caption>
            <thead>
              <tr>
                <th scope="col" className="label border-b border-rule-soft py-1.5 text-left text-ink-3">
                  CVE
                </th>
                <th scope="col" className="label border-b border-rule-soft py-1.5 text-left text-ink-3">
                  Status
                </th>
                <th scope="col" className="label border-b border-rule-soft py-1.5 text-right text-ink-3">
                  EPSS
                </th>
                <th scope="col" className="label hidden border-b border-rule-soft py-1.5 text-right text-ink-3 sm:table-cell">
                  Named
                </th>
              </tr>
            </thead>
            <tbody>
              {named.map((c) => (
                <tr key={c.cve} className="row" data-sev={c.kev ? "kev" : undefined}>
                  <td className="py-2 pr-3">
                    <CveLink cve={c.cve} />
                  </td>
                  <td className="py-2 pr-3">{c.kev ? <span className="stamp">Actively exploited</span> : <span className="label text-ink-3">named</span>}</td>
                  <td className="num py-2 text-right font-mono text-[12px] text-ink-3">{c.epss != null ? pct(c.epss) : ""}</td>
                  <td className="num hidden py-2 text-right font-mono text-[12px] text-ink-3 sm:table-cell">{c.date ? c.date.slice(0, 10) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 max-w-[64ch] text-[13px] leading-relaxed text-ink-3">
            These CVEs appeared in the same dispatches as {actorName}. That is an association in reporting, not a claim
            that this group used them — read the dispatch, then the vendor advisory, before you treat it as either.
          </p>
        </div>
      )}
    </section>
  );
}
