import data from "./data/glossary.json";

// Azerbaijani + English cybersecurity glossary. Content generated once on the
// DigitalOcean inference credit (deepseek-v4-pro) — see ops in the engine repo.
// Each term is its own indexable page (/lugat/<slug>): programmatic long-tail SEO
// in a niche nobody serves in Azerbaijani.
export type GlossaryTerm = { slug: string; term: string; az: string; en: string };

export const GLOSSARY: GlossaryTerm[] = (data as GlossaryTerm[])
  .slice()
  .sort((a, b) => a.term.localeCompare(b.term, "en"));

export function getTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}

// A few sibling terms to cross-link from a term page (keeps crawlers moving,
// helps readers). Deterministic: the next terms alphabetically, wrapping around.
export function siblingTerms(slug: string, n = 6): GlossaryTerm[] {
  const i = GLOSSARY.findIndex((t) => t.slug === slug);
  if (i < 0) return [];
  const out: GlossaryTerm[] = [];
  for (let k = 1; k <= n; k++) out.push(GLOSSARY[(i + k) % GLOSSARY.length]);
  return out;
}
