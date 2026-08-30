import { getDb } from "./db";
import { GLOSSARY, type GlossaryTerm } from "./glossary";

// Full glossary = curated static 60 (hand-reviewed, keep priority) merged with
// the DO-built `glossary_ext` catalogue (~292 bilingual definitions mined from
// the corpus on the DigitalOcean credit). Static wins on term collisions.
// Slugs for DB terms are derived deterministically so every term keeps a
// stable, indexable /glossary/<slug> URL.

export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9əıöüğşç\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

type ExtDoc = { term?: string; az?: string; en?: string; freq?: number };

// --- Render-time quality filter for DB-sourced terms ONLY ------------------
// The DO-mined `glossary_ext` catalogue has a tail of degenerate entries:
// non-technical filler tokens (USE, THIS, NOT, RT, AC, AMA, …) and entries
// whose own definition admits they are not real terms ("… kibertəhlükəsizlik
// termini deyil", "texniki termin mövcud deyil", "qeyri-kafi kontekst" …).
// On a page meant to demonstrate rigor these read as noise. We drop them at
// render time WITHOUT deleting anything — the catalogue stays intact in Mongo;
// getAllTerms simply doesn't surface the junk. The curated static 60 are
// hand-reviewed and are NEVER passed through this filter.

// Definitions thinner than this are too weak to be a useful glossary entry.
const MIN_AZ_LEN = 40;

// Non-technical English filler / social-media noise that is never a real
// security term. Explicit and hand-verified against the live data — NOT a
// generic stopword dump, so it deliberately omits tokens that ARE legitimate
// tech terms (get, put, tor, arp, …). The whitelist below is a second guard.
const STOPWORD_DENYLIST = new Set([
  "use", "this", "that", "the", "and", "for", "with", "are", "was", "were",
  "will", "would", "can", "could", "should", "not", "any", "rt", "ac", "ama",
  "tbh", "imo", "fyi", "lol", "omg", "btw", "aka", "etc", "via", "per", "vs",
  // CTI-analyst audit: these DB entries carry wrong/fabricated definitions
  // (DR→"Demilitarized Zone" [that's DMZ], GFI→"Global Flex International",
  // SC→"Security Certification", UA→"Ukraine armed forces" [UA = User Agent]).
  // None are whitelisted real acronyms, so drop the wrong entries rather than
  // publish a false definition — better absent than misleading.
  "dr", "gfi", "sc", "ua",
]);

// Legitimate short security acronyms that must NEVER be dropped by the
// denylist, even where they collide with an English word (GET/PUT). A
// belt-and-suspenders guard so the denylist can never over-reach onto a real
// term — the curated denylist above already excludes these.
const ACRONYM_WHITELIST = new Set([
  "c2", "rce", "apt", "dns", "sql", "xss", "mfa", "ioc", "ttp", "vpn", "url",
  "ssl", "tls", "ddos", "dos", "ids", "ips", "rat", "soc", "siem", "cve",
  "kev", "pii", "otp", "2fa", "edr", "xdr", "waf", "dkim", "spf", "mx", "ip",
  "os", "av", "ldap", "smb", "rdp", "ssh", "ftp", "http", "https", "jwt",
  "api", "csrf", "ssrf", "lfi", "rfi", "xxe", "csp", "hsts", "poc", "tor",
  "p2p", "dga", "uac", "get", "put", "post", "head", "arp", "c&c",
]);

// Definition self-admits it is not a real/technical term or lacks context.
// Deliberately specific multi-word phrases — never the bare word "deyil"
// ("is not"), which occurs in plenty of perfectly good AZ definitions.
const NOT_A_TERM_RE =
  /(termin(i)?\s+deyil|söz\s+deyil|qeyri-kafi\s+kontekst|kontekst\s+yox|ümumi\s+(bir\s+)?söz|işarə\s+əvəzliyi|mövcud\s+deyil|arxivdə\s+işlənmir|not\s+a\s+(real\s+|genuine\s+)?(term|word)|no\s+context|insufficient\s+context)/i;

// Applies ONLY to DB-sourced terms. True when the entry is too degenerate to
// render on /glossary. Drop if: definition is empty/too thin; OR the definition
// self-admits it isn't a real term; OR the headword is non-technical filler
// (denylist) and not a whitelisted real acronym.
function isDegenerateDbTerm(term: string, az: string): boolean {
  if (az.length < MIN_AZ_LEN) return true;
  if (NOT_A_TERM_RE.test(az)) return true;
  const norm = term.trim().toLowerCase();
  if (!ACRONYM_WHITELIST.has(norm) && STOPWORD_DENYLIST.has(norm)) return true;
  return false;
}

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
      if (isDegenerateDbTerm(term, az)) continue; // drop DB-only junk from render
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
