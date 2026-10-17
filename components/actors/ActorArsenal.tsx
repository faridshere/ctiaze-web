import type { NamedRef } from "@/lib/threatactors";
import type { SoftwareUsage } from "@/lib/actor-intel";
import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

function softwareUrl(id: string | null): string | null {
  return id ? `https://attack.mitre.org/software/${id}` : null;
}

// One ruled listing per group: the name, its ATT&CK S-id (linked), and the
// roster-wide reuse count from the engine's graph — printed only when it says
// something ("shared by 14 actors" is a fact; "shared by 1" is not).
function Listing({ label, items, usage }: { label: string; items: NamedRef[]; usage: SoftwareUsage }) {
  if (items.length === 0) return null;
  return (
    <div>
      <table className="w-full border-collapse">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-rule-soft">
            <th scope="col" className="label pb-1.5 text-left text-ink-3">
              {label} · {items.length}
            </th>
            <th scope="col" className="label pb-1.5 text-right text-ink-3">
              ATT&amp;CK
            </th>
            <th scope="col" className="label hidden pb-1.5 text-right text-ink-3 sm:table-cell">
              Shared by
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const n = it.id ? usage[it.id] ?? 0 : 0;
            const url = softwareUrl(it.id);
            return (
              <tr key={`${it.id ?? it.name}`} className="border-b border-rule-soft">
                <td className="py-1.5 pr-3 text-[14px] leading-snug text-ink">{it.name}</td>
                <td className="num py-1.5 text-right font-mono text-[11.5px] text-ink-3">
                  {url && it.id ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="ulink hover:text-ink">
                      {it.id} ↗
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td className="num hidden py-1.5 text-right font-mono text-[11.5px] text-ink-3 sm:table-cell">{n > 1 ? `${n} actors` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// What this actor is documented using — malware families and off-the-shelf
// tools, each linked to ATT&CK's software entry when we have its S-id.
export function ActorArsenal({
  malware,
  tools,
  usage,
}: {
  malware: NamedRef[];
  tools: NamedRef[];
  usage: SoftwareUsage;
}) {
  if (malware.length === 0 && tools.length === 0) return null;
  const aside = [malware.length ? `${malware.length} malware` : null, tools.length ? `${tools.length} tools` : null].filter(Boolean).join(" · ");
  return (
    <section className={DOSSIER_SECTION} aria-labelledby="arsenal-head">
      <SectionHead id="arsenal-head" aside={aside}>
        Arsenal
      </SectionHead>
      <div className="grid gap-8 pt-4 md:grid-cols-2 md:gap-6">
        <Listing label="Malware" items={malware} usage={usage} />
        <Listing label="Tools" items={tools} usage={usage} />
      </div>
      <p className="label mt-3 text-ink-3">as stated by MITRE ATT&amp;CK · &ldquo;shared by&rdquo; counts roster dossiers citing the same S-id</p>
    </section>
  );
}
