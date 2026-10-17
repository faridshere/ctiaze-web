import { citationActorId, citationEvidence, cleanQuote, normCve, asCitationDocs, type CitationRelation } from "../citations";

// ---------------------------------------------------------------------------
// The pre-run example on the front page's stack check (2026-10-17). Pure
// shaping only, no I/O, so the choice is unit-tested (tests/stack-example.test.ts);
// lib/home-tool.ts reads the inputs once an hour and keeps a last-good copy.
//
// The example is never a fixture: it is one real row of the cited map, a CVE
// that CISA lists as exploited, with its FIRST EPSS score and an actor quoted
// from the report that names them. Nothing here calls NVD or any upstream:
// the product name comes from the same KEV catalogue row.
// ---------------------------------------------------------------------------

export type StackExample = {
  cve: string;
  /** The KEV catalogue's vendor and product, as CISA spells them. */
  vendor: string;
  product: string;
  kevAdded: string | null;
  ransomware: boolean;
  epss: number;
  actor: { id: string; name: string; dossier: boolean };
  quote: string;
  href: string;
  sourceLabel: string;
  relation: CitationRelation;
  /** When the extractor read the quote (ISO), or null. */
  citedAt: string | null;
  /** When this example was computed (ISO): the module's freshness stamp. */
  generatedAt: string;
};

export type KevFact = { vendor: string; product: string; dateAdded: string | null; ransomware: boolean };

/** The front page fits one quote above the fold; the dossier and /cve print it whole. */
export const EXAMPLE_QUOTE_MAX = 300;

const RELATION_RANK: Record<CitationRelation, number> = { exploited: 0, used_in_campaign: 1, attributed_by_report: 2 };

/**
 * One example from candidate citations, or null when none qualifies. A
 * candidate must carry a quote and a source link (citationEvidence), a CVE that
 * the KEV catalogue lists with a vendor and product, and a known EPSS score.
 * Preference: actors with a dossier, then the strongest relation, then a quote
 * that names the actor itself, then the newest extraction.
 */
export function pickExample(
  citations: unknown,
  kev: ReadonlyMap<string, KevFact>,
  epss: ReadonlyMap<string, number>,
  names: ReadonlyMap<string, string>,
  now: Date,
): StackExample | null {
  type Cand = { ex: Omit<StackExample, "generatedAt">; key: number[]; at: number };
  const cands: Cand[] = [];
  for (const doc of asCitationDocs(citations)) {
    const cve = normCve(doc.cve);
    const actorId = citationActorId(doc.actor_id);
    const ev = citationEvidence(doc);
    if (!cve || !actorId || !ev || !ev.external) continue;
    const k = kev.get(cve);
    if (!k || !k.vendor.trim() || !k.product.trim()) continue;
    const score = epss.get(cve);
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) continue;
    const name = names.get(actorId);
    const fallbackName = typeof doc.actor_text === "string" ? doc.actor_text.trim() : "";
    if (!name && !fallbackName) continue;
    const quote = cleanQuote(doc.quote, EXAMPLE_QUOTE_MAX);
    if (!quote) continue;
    cands.push({
      ex: {
        cve,
        vendor: k.vendor.trim(),
        product: k.product.trim(),
        kevAdded: k.dateAdded,
        ransomware: k.ransomware,
        epss: score,
        actor: { id: actorId, name: name ?? fallbackName, dossier: !!name },
        quote,
        href: ev.href,
        sourceLabel: ev.sourceLabel,
        relation: ev.relation,
        citedAt: ev.date,
      },
      key: [name ? 0 : 1, RELATION_RANK[ev.relation], ev.inQuote ? 0 : 1],
      at: ev.date ? Date.parse(ev.date) : -Infinity,
    });
  }
  cands.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
    if (a.at !== b.at) return b.at - a.at;
    return a.ex.cve.localeCompare(b.ex.cve);
  });
  const best = cands[0];
  return best ? { ...best.ex, generatedAt: now.toISOString() } : null;
}

/** CVE ids among the candidates that could still qualify, for the EPSS lookup. */
export function exampleCveIds(citations: unknown, kev: ReadonlyMap<string, KevFact>, max = 100): string[] {
  const out: string[] = [];
  for (const doc of asCitationDocs(citations)) {
    const cve = normCve(doc.cve);
    if (!cve || out.includes(cve) || !kev.has(cve) || !citationEvidence(doc)) continue;
    out.push(cve);
    if (out.length >= max) break;
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "HH:MM UTC" for a freshness stamp, or null for a missing or epoch date. When
 * `ref` (the page's own render time) falls on a later UTC day, the date is
 * printed too ("16 Oct 21:04 UTC"), so a last-good copy served after an outage
 * never reads as this morning's.
 */
export function utcStamp(iso: string | null | undefined, ref?: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t) || t <= 0) return null;
  const s = new Date(t).toISOString();
  const r = ref ? Date.parse(ref) : NaN;
  const sameDay = !Number.isFinite(r) || new Date(r).toISOString().slice(0, 10) === s.slice(0, 10);
  const day = sameDay ? "" : `${Number(s.slice(8, 10))} ${MONTHS[Number(s.slice(5, 7)) - 1]} `;
  return `${day}${s.slice(11, 16)} UTC`;
}
