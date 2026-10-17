import Link from "next/link";
import type { ActorCve } from "@/lib/threatactors";
import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

// CVEs our own dispatches named in the same reporting as this adversary.
//
// The heading says "named alongside", not "exploits", and the note says so
// again: a story can name a group and a flaw without the group having used the
// flaw. Calling that "exploits" would be the single easiest way for this site
// to start publishing attribution it cannot support, so it does not.
export function ActorCves({ cves, actorName }: { cves: ActorCve[] | null | undefined; actorName: string }) {
  const all = cves ?? [];
  if (all.length === 0) return null;
  // KEV first (observed exploitation), then by EPSS, then newest.
  // null EPSS means UNKNOWN, not zero — the same rule the rest of the site
  // states. Unknowns sort after every known score rather than below the lowest.
  const byEpss = (x: ActorCve, y: ActorCve) => {
    if (x.epss == null && y.epss == null) return 0;
    if (x.epss == null) return 1;
    if (y.epss == null) return -1;
    return y.epss - x.epss;
  };
  const rows = [...all]
    .sort(
      (a, b) =>
        Number(!!b.kev) - Number(!!a.kev) ||
        byEpss(a, b) ||
        String(b.date ?? "").localeCompare(String(a.date ?? ""))
    )
    .slice(0, 24);
  const kevCount = rows.filter((r) => r.kev).length;

  return (
    <section className={DOSSIER_SECTION} aria-labelledby="cves-head">
      <SectionHead id="cves-head" aside={kevCount > 0 ? `${kevCount} on CISA KEV` : "none on KEV"}>
        CVEs named alongside {actorName}
      </SectionHead>
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
          {rows.map((c) => (
            <tr key={c.cve} className="row" data-sev={c.kev ? "kev" : undefined}>
              <td className="py-2 pr-3">
                <Link href={`/cve/${c.cve.toUpperCase()}`} className="num font-mono text-[13px] text-ink underline-offset-[3px] hover:underline">
                  {c.cve.toUpperCase()}
                </Link>
              </td>
              <td className="py-2 pr-3">{c.kev ? <span className="stamp">Actively exploited</span> : <span className="label text-ink-3">named</span>}</td>
              <td className="num py-2 text-right font-mono text-[12px] text-ink-3">{c.epss != null ? `${(c.epss * 100).toFixed(c.epss >= 0.1 ? 0 : 1)}%` : ""}</td>
              <td className="num hidden py-2 text-right font-mono text-[12px] text-ink-3 sm:table-cell">{c.date ? String(c.date).slice(0, 10) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 max-w-[64ch] text-[13px] leading-relaxed text-ink-3">
        These CVEs appeared in the same dispatches as {actorName}. That is an association in reporting, not a claim
        that this group used them — read the dispatch, then the vendor advisory, before you treat it as either.
      </p>
    </section>
  );
}
