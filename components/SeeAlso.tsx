import Link from "next/link";
import { getRelated, type RelatedKind } from "@/lib/related";

// Cross-knowledge "See also / Əlaqəli" mesh: precomputed bge-m3 neighbours
// (kb_related) rendered as sweepable chips, each tagged with the target kind so a
// reader — and a crawler — can hop from a CVE to its attack-type guide, from one
// actor to its peers, from a glossary term to the guide that uses it. getRelated
// guarantees every href resolves to a live route, so this never renders a dead end.

// Tiny type tag shown on each chip. AZ-leaning (the site's default), EN when asked.
const TAG: Record<RelatedKind, { az: string; en: string }> = {
  cve: { az: "CVE", en: "CVE" },
  actor: { az: "AKTOR", en: "ACTOR" },
  concept: { az: "HÜCUM", en: "ATTACK" },
  glossary: { az: "LÜĞƏT", en: "TERM" },
};

export async function SeeAlso({
  sourceType,
  sourceId,
  en,
}: {
  sourceType: string;
  sourceId: string;
  en: boolean;
}) {
  const links = await getRelated(sourceType, sourceId).catch(() => []);
  if (!links.length) return null;

  return (
    <section data-sc className="mt-12 border-t border-hairline pt-6">
      <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
        {en ? "See also" : "Əlaqəli"}
        <span aria-hidden className="h-px flex-1 bg-hairline" />
        <span className="font-normal text-ink-muted">{links.length}</span>
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => {
          const tag = TAG[l.type];
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className="sweepable group inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-[12.5px] text-ink-secondary transition-colors hover:border-brand hover:text-brand"
              >
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-muted transition-colors group-hover:text-brand">
                  {en ? tag.en : tag.az}
                </span>
                <span>{l.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
