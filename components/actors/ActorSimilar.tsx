import Link from "next/link";
import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import { ActorSigil, type SigilSeed } from "@/components/actors/ActorSigil";

export type SimilarEntry = {
  id: string;
  name: string;
  score: number;
  sigil: SigilSeed;
  /** techniques and software this actor shares with the dossier's subject, real overlap only */
  sharedTechniques: number;
  sharedTools: number;
};

// Embedding neighbours from the engine's actor_pack, made legible: a real
// reason to click when we have one (shared techniques or shared malware/tools),
// an honest "semantic match only" when the similarity is purely vector-space.
export function ActorSimilar({ items }: { items: SimilarEntry[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Kicker>Similar adversaries</Kicker>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const shared = it.sharedTechniques + it.sharedTools;
          return (
            <Link key={it.id} href={`/actors/${it.id}`} className="block">
              <Panel interactive className="flex items-center gap-3 p-4">
                <span className="shrink-0 text-ink-secondary">
                  <ActorSigil a={it.sigil} size={40} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-ink-primary">{it.name}</span>
                  <span className="mt-1 block font-mono text-[11px] text-ink-muted">
                    similarity {it.score.toFixed(2)}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-ink-muted">
                    {shared > 0
                      ? `shares ${it.sharedTechniques} techniques · ${it.sharedTools} tools`
                      : "semantic match only"}
                  </span>
                </span>
              </Panel>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
