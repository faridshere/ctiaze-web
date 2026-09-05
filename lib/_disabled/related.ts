import { cache } from "react";
import { getDb } from "../db";
import { cveIntelIdSet, normalizeCveId } from "./cveintel-page";
import { getActorById } from "./threatactors";
import { getGuideSlugs } from "./guides";
import { getTermAny } from "./glossary-db";

// The DO-built `kb_related` collection (~10.3k bge-m3 nearest-neighbour sets, one
// per cve / actor / concept / glossary / malware entity). Each doc is keyed
// `${type}:${id}` and carries a `related` array of {type,id,title,sim}. This turns
// the ~10k leaf pages into an internal-link web ("See also / Əlaqəli").
//
// READ-ONLY, and it NEVER emits a link that doesn't resolve to a live route — a
// mesh of 404s is worse than no mesh — so every neighbour is verified against the
// real collection behind its route before it becomes a chip. "malware" (and any
// future type without a page) is skipped entirely.

export type RelatedKind = "cve" | "actor" | "concept" | "glossary";
export type RelatedLink = { type: RelatedKind; href: string; name: string };

type Neighbor = { type?: string; id?: string; title?: string; sim?: number };
type KbDoc = { _id: string; type?: string; title?: string; related?: Neighbor[] };

// Which kb_related neighbour types have a route, and where each one points.
// (malware → no /malware page exists → not listed → skipped.)
const ROUTABLE: ReadonlySet<string> = new Set<RelatedKind>([
  "cve",
  "actor",
  "concept",
  "glossary",
]);

const MAX = 6;

/**
 * getRelated(sourceType, sourceId) → resolved, routable neighbours for one entity.
 *
 * sourceType is the kb_related source kind AND the `_id` prefix:
 *   cve      (page passes doc.id)  →  /cve/[id]
 *   actor    (page passes a._id)   →  /actors/[slug]
 *   concept  (page passes slug)    →  /attacks/[slug]
 *   glossary (page passes g.slug)  →  /glossary/[slug]
 *
 * cache()-wrapped so a page that reads it in both generateMetadata and the body
 * (or twice on one render) pays a single Mongo read. Returns [] on any miss.
 */
export const getRelated = cache(
  async (sourceType: string, sourceId: string): Promise<RelatedLink[]> => {
    if (!sourceType || !sourceId) return [];
    // CVE ids are stored canonical-uppercase; everything else is used verbatim.
    const rootId = sourceType === "cve" ? normalizeCveId(sourceId) : sourceId.trim();
    if (!rootId) return [];

    let doc: KbDoc | null = null;
    try {
      const col = (await getDb()).collection<KbDoc>("kb_related");
      doc = await col.findOne({ _id: `${sourceType}:${rootId}` });
    } catch {
      return []; // DB unreachable → no mesh, but the page still renders
    }
    if (!doc?.related?.length) return [];

    // Normalise + dedupe candidates; drop malformed, unroutable types, and any
    // neighbour that points back at the source itself.
    const seen = new Set<string>();
    const cands: { type: RelatedKind; id: string; name: string; sim: number }[] = [];
    for (const r of doc.related) {
      const type = (r?.type ?? "").trim();
      const id = (r?.id ?? "").trim();
      if (!type || !id || !ROUTABLE.has(type)) continue;
      const isSelf =
        type === sourceType &&
        (type === "cve" ? normalizeCveId(id) === rootId : id === rootId);
      if (isSelf) continue;
      const key = `${type}:${type === "cve" ? id.toUpperCase() : id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cands.push({
        type: type as RelatedKind,
        id,
        name: (r?.title ?? "").trim() || id,
        sim: typeof r?.sim === "number" ? r.sim : 0,
      });
    }
    if (!cands.length) return [];
    cands.sort((a, b) => b.sim - a.sim); // most-similar first

    // Batch the set-checkable guards once; resolve actor/glossary per neighbour
    // (both hit an already-cached roster/catalogue, so this is in-memory).
    const cveWanted = cands.filter((c) => c.type === "cve").map((c) => c.id);
    const cveOk = cveWanted.length
      ? await cveIntelIdSet(cveWanted).catch(() => new Set<string>())
      : new Set<string>();
    const guideOk = cands.some((c) => c.type === "concept")
      ? new Set(await getGuideSlugs().catch(() => []))
      : new Set<string>();

    const out: RelatedLink[] = [];
    for (const c of cands) {
      if (out.length >= MAX) break;
      switch (c.type) {
        case "cve": {
          const norm = normalizeCveId(c.id);
          if (norm && cveOk.has(norm))
            out.push({ type: "cve", href: `/cve/${norm}`, name: c.name });
          break;
        }
        case "concept": {
          if (guideOk.has(c.id))
            out.push({ type: "concept", href: `/attacks/${c.id}`, name: c.name });
          break;
        }
        case "actor": {
          const a = await getActorById(c.id).catch(() => null);
          if (a) out.push({ type: "actor", href: `/actors/${a._id}`, name: c.name });
          break;
        }
        case "glossary": {
          const g = await getTermAny(c.id).catch(() => undefined);
          if (g) out.push({ type: "glossary", href: `/glossary/${g.slug}`, name: c.name });
          break;
        }
      }
    }
    return out;
  },
);
