import { getDb } from "./db";
import { GLOSSARY, type GlossaryTerm } from "./glossary";

// Full glossary = curated static 60 (hand-reviewed, keep priority) merged with
// the DO-built `glossary_ext` catalogue (~292 bilingual definitions mined from
// the corpus on the DigitalOcean credit). Static wins on term collisions.
// Slugs for DB terms are derived deterministically so every term keeps a
// stable, indexable /lugat/<slug> URL.

export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9əıöüğşç\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

type ExtDoc = { term?: string; az?: string; en?: string; freq?: number };

let cache: { at: number; terms: GlossaryTerm[] } | null = null;
const TTL_MS = 60 * 60_000;

export async function getAllTerms(): Promise<GlossaryTerm[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.terms;

  const bySlug = new Map<string, GlossaryTerm>();
  for (const g of GLOSSARY) bySlug.set(g.slug, g);
  const staticNorm = new Set(GLOSSARY.map((g) => g.term.trim().toLowerCase()));

  try {
    const db = await getDb();
    const docs = await db
      .collection<ExtDoc>("glossary_ext")
      .find({}, { projection: { _id: 0, term: 1, az: 1, en: 1 } })
      .toArray();
    for (const d of docs) {
      const term = (d.term ?? "").trim();
      const az = (d.az ?? "").trim();
      if (!term || !az) continue;
      if (staticNorm.has(term.toLowerCase())) continue; // curated copy wins
      const slug = slugifyTerm(term);
      if (!slug || bySlug.has(slug)) continue;
      bySlug.set(slug, { slug, term, az, en: (d.en ?? "").trim() });
    }
  } catch {
    // DB unreachable → static-only glossary still works.
  }

  const terms = [...bySlug.values()].sort((a, b) =>
    a.term.localeCompare(b.term, "en"),
  );
  cache = { at: Date.now(), terms };
  return terms;
}

export async function getTermAny(slug: string): Promise<GlossaryTerm | undefined> {
  const all = await getAllTerms();
  return all.find((t) => t.slug === slug);
}

export async function siblingTermsAny(slug: string, n = 6): Promise<GlossaryTerm[]> {
  const all = await getAllTerms();
  const i = all.findIndex((t) => t.slug === slug);
  if (i < 0) return [];
  const out: GlossaryTerm[] = [];
  for (let k = 1; k <= n; k++) out.push(all[(i + k) % all.length]);
  return out;
}

export async function getGlossaryCount(): Promise<number> {
  return (await getAllTerms()).length;
}
