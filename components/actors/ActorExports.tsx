import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

// The dossier as data, set as a classified in a double box. A practitioner's
// first question about any threat-intel page is "can I get this into my
// tooling" — an ATT&CK Navigator layer opens in Navigator, a STIX 2.1 bundle
// imports into MISP or OpenCTI, and the JSON is the same record the site
// itself renders. No key, no signup.
const EXPORTS = [
  {
    label: "ATT&CK Navigator layer",
    note: "open at mitre-attack.github.io/attack-navigator",
    path: (id: string) => `/actors/${id}/navigator.json`,
    needsTechniques: true,
  },
  {
    label: "STIX 2.1 bundle",
    note: "intrusion-set, techniques, malware, tools, relationships",
    path: (id: string) => `/actors/${id}/stix.json`,
    needsTechniques: false,
  },
  {
    label: "JSON",
    note: "the same record this page renders",
    path: (id: string) => `/api/v1/actors/${id}`,
    needsTechniques: false,
  },
] as const;

export function ActorExports({ id, techniqueCount }: { id: string; techniqueCount: number }) {
  // The Navigator layer is hidden with no techniques: an empty layer loads as a
  // blank matrix, which looks like our bug rather than a gap in the source.
  const shown = EXPORTS.filter((e) => !e.needsTechniques || techniqueCount > 0);
  return (
    <section className={DOSSIER_SECTION} aria-labelledby="exports-head">
      <SectionHead id="exports-head" aside="keyless · no signup">
        Take it with you
      </SectionHead>
      <div className="double-box mt-4 p-[3px]">
        <ul className={`cells ${shown.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {shown.map((e) => (
            <li key={e.label}>
              <a href={e.path(id)} className="group block h-full p-4 transition-colors hover:bg-paper-deep sm:p-5">
                {/* Archivo, not the slab: the headline face is for headlines and adversary names only. */}
                <span className="block text-[17px] font-semibold leading-tight text-ink">{e.label} ↓</span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-2">{e.note}</span>
                <span className="num mt-3 block truncate font-mono text-[11px] text-ink-3">{e.path(id)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
