import { Kicker } from "@/components/site/Kicker";

// The dossier as data. A practitioner's first question about any threat-intel
// page is "can I get this into my tooling" — an ATT&CK Navigator layer opens
// in Navigator, a STIX 2.1 bundle imports into MISP or OpenCTI, and the JSON
// is the same record the site itself renders. No key, no signup.
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
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Kicker>Take it with you</Kicker>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {shown.map((e) => (
          <li key={e.label}>
            <a
              href={e.path(id)}
              className="group block rounded-[var(--radius-panel)] border border-hairline p-4 transition-colors hover:border-brand"
            >
              <span className="block text-[14px] font-medium text-ink-primary transition-colors group-hover:text-brand">
                {e.label} ↓
              </span>
              <span className="mt-1 block font-mono text-[11px] leading-relaxed text-ink-muted">{e.note}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
