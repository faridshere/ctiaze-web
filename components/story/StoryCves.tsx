import Link from "next/link";
import type { CveBadge } from "@/lib/cveintel";
import { RuledSection } from "./Ruled";

// The CVE table. Each id opens the site's own hub for that CVE (every
// dispatch, KEV, EPSS, CVSS, exposure, the actors that use it); NVD stays one
// click further. A real table with label heads and ruled rows; a KEV row
// carries the stamp and the double rule.
export function StoryCves({ cveIds, badges }: { cveIds: string[]; badges: Map<string, CveBadge> }) {
  if (cveIds.length === 0) return null;
  return (
    <RuledSection label={cveIds.length === 1 ? "CVE" : `CVE · ${cveIds.length}`} meta="KEV from CISA · EPSS from FIRST">
      <table className="w-full border-collapse">
        <caption className="sr-only">CVE ids in this dispatch with their KEV status and EPSS score</caption>
        <thead>
          <tr className="border-b border-rule-soft">
            <th scope="col" className="label py-2 pr-3 text-left text-ink-3">Id</th>
            <th scope="col" className="label py-2 pr-3 text-left text-ink-3">KEV</th>
            <th scope="col" className="label py-2 pr-3 text-right text-ink-3">EPSS</th>
            <th scope="col" className="label py-2 text-right text-ink-3">
              <span className="sr-only">Reference</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cveIds.map((cve) => {
            const id = cve.toUpperCase();
            const b = badges.get(id);
            const epssPct = b?.epss != null ? b.epss * 100 : null;
            return (
              <tr key={cve} className="row align-middle" data-sev={b?.kev ? "kev" : undefined}>
                <td className="py-2.5 pr-3">
                  <Link href={`/cve/${id}`} className="num ulink font-mono text-[13px] text-ink hover:text-ink">
                    {id}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">{b?.kev ? <span className="stamp">KEV</span> : <span className="font-mono text-[11px] text-ink-3">—</span>}</td>
                <td className="num py-2.5 pr-3 text-right font-mono text-[12.5px] text-ink">
                  {epssPct != null ? `${epssPct.toFixed(epssPct < 1 ? 2 : 0)}%` : <span className="text-ink-3">—</span>}
                </td>
                <td className="py-2.5 text-right">
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label ulink whitespace-nowrap text-ink-3 hover:text-ink"
                  >
                    NVD ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </RuledSection>
  );
}
