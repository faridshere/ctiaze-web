import Link from "next/link";
import { ActorSigil, type SigilSeed } from "@/components/actors/ActorSigil";
import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

export type SimilarEntry = {
  id: string;
  name: string;
  score: number;
  sigil: SigilSeed;
  /** techniques and software this actor shares with the dossier's subject, real overlap only */
  sharedTechniques: number;
  sharedTools: number;
};

// Embedding neighbours from the engine's actor_pack, made legible as a table:
// a real reason to click when we have one (shared techniques or shared
// malware/tools, counted), an honest "semantic match only" when the
// similarity is purely vector-space.
export function ActorSimilar({ items }: { items: SimilarEntry[] }) {
  // A "semantic match only" below this line is embedding noise dressed as a
  // finding; practitioners called it out. Shared techniques or tools always show.
  const shown = items.filter((it) => it.sharedTechniques + it.sharedTools > 0 || it.score >= 0.8);
  if (shown.length === 0) return null;
  return (
    <section className={DOSSIER_SECTION} aria-labelledby="similar-head">
      <SectionHead id="similar-head" aside="engine neighbours · overlap counted from ATT&CK ids">
        Similar adversaries
      </SectionHead>
      <table className="w-full border-collapse">
        <caption className="sr-only">Adversaries similar to this one, with the techniques and tools they share</caption>
        <thead>
          <tr>
            <th scope="col" className="label border-b border-rule-soft py-1.5 text-left text-ink-3">
              Adversary
            </th>
            <th scope="col" className="label border-b border-rule-soft py-1.5 text-right text-ink-3">
              Shared techniques
            </th>
            <th scope="col" className="label border-b border-rule-soft py-1.5 text-right text-ink-3">
              Shared tools
            </th>
            <th scope="col" className="label hidden border-b border-rule-soft py-1.5 text-right text-ink-3 sm:table-cell">
              Similarity
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((it) => {
            const shared = it.sharedTechniques + it.sharedTools;
            return (
              <tr key={it.id} className="border-b border-rule-soft">
                <td className="py-2 pr-3">
                  <Link href={`/actors/${it.id}`} className="group inline-flex min-w-0 items-center gap-3 text-ink">
                    <span className="shrink-0 text-ink-2">
                      <ActorSigil a={it.sigil} size={28} />
                    </span>
                    <span className="min-w-0">
                      <span className="pressed block truncate text-[19px] leading-tight sm:text-[21px]">{it.name}</span>
                      {shared === 0 && <span className="label block text-ink-3">semantic match only</span>}
                    </span>
                  </Link>
                </td>
                <td className="num py-2 text-right font-mono text-[14px] text-ink">{it.sharedTechniques || ""}</td>
                <td className="num py-2 text-right font-mono text-[14px] text-ink">{it.sharedTools || ""}</td>
                <td className="num hidden py-2 text-right font-mono text-[12px] text-ink-3 sm:table-cell">{it.score.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
