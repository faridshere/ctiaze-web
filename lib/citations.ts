import { canonicalActorId } from "./actor-aliases";

// ---------------------------------------------------------------------------
// Cited actor-to-CVE links (2026-10-17). Pure shaping only, no database, so
// every rule below is unit-testable from fixtures (tests/citations.test.ts);
// the reads live in lib/citations-db.ts.
//
// The engine writes two kinds of rows:
//   • threat_actors.<id>.cves — the dossier's own CVE list. Rows mined from a
//     report carry `evidence` (a verbatim quote) and `url` (the report); older
//     rows carry only `item`, the story id that named both.
//   • cve_actor_citations — one document per (actor, CVE, source) with the
//     quote, the source url and the relation the extractor read.
//
// The one rule: a citation is shown only with its quote AND a source link. A
// row missing either is dropped here, never rendered as a bare claim, and the
// wording is always "cited as …", never "confirmed".
//
// Review fixes (2026-10-17, PR #12): every row is type-checked at runtime
// before a string op touches it (the Mongo read is only a cast); actor ids are
// grouped under canonicalActorId like every other actor surface; an unknown
// relation reads as the weakest claim; a dispatch link is the story's full
// canonical slug, never a 12-char prefix that can name a different CVE; and a
// citation whose actor is only named near the quote (actor_in_quote false) is
// labelled so and sorted after the ones whose quote names the actor.
// ---------------------------------------------------------------------------

export type CitationRelation = "exploited" | "used_in_campaign" | "attributed_by_report";

/** A cve_actor_citations document as the engine writes it. */
export type CveActorCitationDoc = {
  _id?: unknown;
  cve: string;
  actor_id: string;
  actor_text?: string | null;
  relation?: string | null;
  quote?: string | null;
  url?: string | null;
  host?: string | null;
  kind?: "item" | "report" | string | null;
  model?: string | null;
  extracted_at?: Date | string | null;
  kev?: boolean | null;
  /** true: the quote itself names the actor; false: named within ~400 chars of it. */
  actor_in_quote?: boolean | null;
};

/** A threat_actors.<id>.cves row, including the evidence-bearing fields. */
export type ActorCveRow = {
  cve: string;
  kev?: boolean | null;
  epss?: number | null;
  item?: string | null;
  date?: string | Date | null;
  source?: string | null;
  evidence?: string | null;
  url?: string | null;
  relation?: string | null;
  actor_in_quote?: boolean | null;
};

/** One piece of evidence, ready to render: always a quote and a link. */
export type Evidence = {
  quote: string;
  /** Absolute source url, or a site-relative /news/… link to our own dispatch. */
  href: string;
  /** Short label for the link: the host, or "our dispatch". */
  sourceLabel: string;
  external: boolean;
  relation: CitationRelation;
  /** ISO date (yyyy-mm-dd…) or null when the row carries none. */
  date: string | null;
  /**
   * The quote itself names the actor. false = the actor is only named near
   * the quote (or the row does not say), which pages label "named nearby".
   */
  inQuote: boolean;
};

export const MAX_EVIDENCE = 5;
// A verbatim quote is printed whole up to this length; past it the tail is cut
// with an ellipsis so one runaway extraction cannot take over the page.
export const MAX_QUOTE = 480;

export const CVE_RE = /^CVE-\d{4}-\d{4,7}$/;

export function normCve(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const u = id.trim().toUpperCase();
  return CVE_RE.test(u) ? u : null;
}

/** The values a stored `cve` may hold for one normalised id (the engine has written lower case). */
export function cveQueryValues(cve: string): string[] {
  return [...new Set([cve.toUpperCase(), cve.toLowerCase()])];
}

// ---- Runtime shape checks ---------------------------------------------------
// The Mongo reads are casts, so nothing guarantees a field is the type we
// declare. One document with a numeric quote or an object actor_id would throw
// in a .trim() and take the CVE page, the dossier and the API down with it.
// A row with any field of the wrong type is dropped whole: half-trusting a
// malformed row is how a quote ends up under the wrong CVE or actor.
const optStr = (v: unknown) => v == null || typeof v === "string";
const optBool = (v: unknown) => v == null || typeof v === "boolean";
const optDate = (v: unknown) => v == null || typeof v === "string" || v instanceof Date;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** A cve_actor_citations document whose fields have the declared types, or null. */
export function asCitationDoc(raw: unknown): CveActorCitationDoc | null {
  if (!isObj(raw)) return null;
  if (typeof raw.cve !== "string" || typeof raw.actor_id !== "string") return null;
  for (const k of ["actor_text", "relation", "quote", "url", "host", "kind", "model"]) if (!optStr(raw[k])) return null;
  if (!optDate(raw.extracted_at) || !optBool(raw.kev) || !optBool(raw.actor_in_quote)) return null;
  return raw as CveActorCitationDoc;
}

/** A threat_actors.<id>.cves row whose fields have the declared types, or null. */
export function asActorCveRow(raw: unknown): ActorCveRow | null {
  if (!isObj(raw)) return null;
  if (typeof raw.cve !== "string") return null;
  for (const k of ["item", "source", "evidence", "url", "relation"]) if (!optStr(raw[k])) return null;
  if (!optDate(raw.date) || !optBool(raw.kev) || !optBool(raw.actor_in_quote)) return null;
  if (raw.epss != null && (typeof raw.epss !== "number" || !Number.isFinite(raw.epss))) return null;
  return raw as ActorCveRow;
}

function validList<T>(list: unknown, check: (x: unknown) => T | null): T[] {
  if (!Array.isArray(list)) return [];
  const out: T[] = [];
  for (const x of list) {
    const v = check(x);
    if (v) out.push(v);
  }
  return out;
}

export const asCitationDocs = (list: unknown) => validList(list, asCitationDoc);
export const asActorCveRows = (list: unknown) => validList(list, asActorCveRow);

/** The id an actor is published under: trimmed, then mapped through canonicalActorId. */
export function citationActorId(id: string): string {
  const t = id.trim();
  return t ? canonicalActorId(t) : "";
}

// Unknown, null or misspelt relations read as the WEAKEST claim the page has a
// phrase for, never as "exploited": a guess must not upgrade what a source said.
export function relationOf(r: string | null | undefined): CitationRelation {
  return r === "exploited" || r === "used_in_campaign" ? r : "attributed_by_report";
}

/** The phrase a page prints for a relation. Never "confirmed". */
export function relationLabel(r: CitationRelation): string {
  if (r === "used_in_campaign") return "cited as used in a campaign";
  if (r === "attributed_by_report") return "attributed by a report";
  return "cited as exploiting";
}

const RELATION_ORDER: CitationRelation[] = ["exploited", "used_in_campaign", "attributed_by_report"];

/** The distinct relations a set of evidence lists carries, strongest first. */
export function relationsIn(lists: Evidence[][]): CitationRelation[] {
  const s = new Set(lists.flat().map((e) => e.relation));
  return RELATION_ORDER.filter((r) => s.has(r));
}

// Headings are worded from the relations actually present: a section whose
// every quote is "attributed by a report" must not be headed "exploiting".
/** The dossier's heading over its cited CVEs. */
export function dossierCitedHeading(relations: CitationRelation[], actorName: string): string {
  if (relations.length === 1) {
    if (relations[0] === "exploited") return `CVEs ${actorName} is cited as exploiting`;
    if (relations[0] === "used_in_campaign") return `CVEs ${actorName} is cited as using in a campaign`;
    return `CVEs reports attribute to ${actorName}`;
  }
  return `CVEs cited sources tie to ${actorName}`;
}

/** The CVE page's heading over its cited actors. */
export function cveCitedHeading(relations: CitationRelation[]): string {
  if (relations.length === 1) {
    if (relations[0] === "exploited") return "Cited as exploited by";
    if (relations[0] === "used_in_campaign") return "Cited as used in a campaign by";
    return "Attributed by reports to";
  }
  return "Tied by cited sources to";
}

export function cleanQuote(q: unknown, max = MAX_QUOTE): string | null {
  if (typeof q !== "string") return null;
  const t = q.replace(/\s+/g, " ").trim();
  if (t.length < 8) return null;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** An http(s) url, or null. A javascript:/data: or relative value is dropped. */
export function safeUrl(u: unknown): string | null {
  const s = typeof u === "string" ? u.trim() : "";
  if (!s) return null;
  try {
    const p = new URL(s);
    return p.protocol === "https:" || p.protocol === "http:" ? p.toString() : null;
  } catch {
    return null;
  }
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

const STORY_ID_RE = /^(cve:|url:|digest:|spike:)\S{4,}$/;

/** An engine story id, or null when the value is not one. */
export function storyId(item: unknown): string | null {
  const id = typeof item === "string" ? item.trim() : "";
  return STORY_ID_RE.test(id) ? id : null;
}

/**
 * Our own dispatch for an engine story id, by its FULL canonical slug, or null.
 * `slugs` maps exact story _id → slug (lib/stories.ts getStorySlugsByIds). A
 * bare 12-char key is never built here: "CVE-2026-202" is a prefix of a
 * hundred CVE ids, so /news/<key> can resolve to a dispatch about another CVE.
 */
export function storyHref(item: unknown, slugs: ReadonlyMap<string, string> = new Map()): string | null {
  const id = storyId(item);
  const slug = id ? slugs.get(id) : undefined;
  return slug ? `/news/${slug}` : null;
}

/** Story ids the dossier needs a slug for: rows with a quote but no source url. */
export function storyIdsNeedingSlugs(rows: unknown): string[] {
  const ids = new Set<string>();
  for (const r of asActorCveRows(rows)) {
    if (!cleanQuote(r.evidence) || safeUrl(r.url)) continue;
    const id = storyId(r.item);
    if (id) ids.add(id);
  }
  return [...ids];
}

export function isoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** A citation document as evidence, or null when it lacks a quote or a source. */
export function citationEvidence(raw: unknown): Evidence | null {
  const doc = asCitationDoc(raw);
  if (!doc) return null;
  const quote = cleanQuote(doc.quote);
  const href = safeUrl(doc.url);
  if (!quote || !href) return null;
  return {
    quote,
    href,
    sourceLabel: (doc.host ?? "").trim().replace(/^www\./, "") || hostOf(href),
    external: true,
    relation: relationOf(doc.relation),
    date: isoDate(doc.extracted_at),
    inQuote: doc.actor_in_quote === true,
  };
}

/**
 * The citations a page can actually print: well-typed, a real CVE id, an actor
 * id, a quote and a source. Pages gate on this, not on the raw read, so a pile
 * of incomplete rows neither renders an empty section nor counts as "known".
 */
export function displayableCitations(list: unknown): CveActorCitationDoc[] {
  return asCitationDocs(list).filter((d) => normCve(d.cve) && citationActorId(d.actor_id) && citationEvidence(d));
}

/** The canonical actor ids of the citations a page can print. */
export function citedActorIds(list: unknown): string[] {
  return [...new Set(displayableCitations(list).map((d) => citationActorId(d.actor_id)))];
}

/** A dossier CVE row as evidence: its url if present, else our story by its full slug. */
export function rowEvidence(raw: unknown, slugs: ReadonlyMap<string, string> = new Map()): Evidence | null {
  const row = asActorCveRow(raw);
  if (!row) return null;
  const quote = cleanQuote(row.evidence);
  if (!quote) return null;
  const url = safeUrl(row.url);
  const story = url ? null : storyHref(row.item, slugs);
  const href = url ?? story;
  if (!href) return null;
  const src = (row.source ?? "").trim().replace(/^report:/, "").replace(/^www\./, "");
  return {
    quote,
    href,
    sourceLabel: url ? src || hostOf(url) : "our dispatch",
    external: !!url,
    // Most dossier rows carry no relation; relationOf reads that as the
    // weakest claim rather than as "exploited".
    relation: relationOf(row.relation),
    date: isoDate(row.date),
    inQuote: row.actor_in_quote === true,
  };
}

// Same quote from the same source, written once to the dossier row and once to
// cve_actor_citations, must print once.
function evidenceKey(e: Evidence): string {
  return `${e.href.replace(/\/+$/, "").toLowerCase()}|${e.quote.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 120)}`;
}

/**
 * Dedupe, then quotes that name the actor before "named nearby" ones, each
 * newest first (undated last), capped. Returns the shown list and how many were
 * left out.
 */
export function rankEvidence(list: Evidence[], max = MAX_EVIDENCE): { shown: Evidence[]; more: number } {
  const seen = new Set<string>();
  const uniq: Evidence[] = [];
  for (const e of list) {
    const k = evidenceKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(e);
  }
  uniq.sort((a, b) => {
    if (a.inQuote !== b.inQuote) return a.inQuote ? -1 : 1;
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
  return { shown: uniq.slice(0, max), more: Math.max(0, uniq.length - max) };
}

export type DossierCve = {
  cve: string;
  kev: boolean;
  epss: number | null;
  date: string | null;
  evidence: Evidence[];
  moreEvidence: number;
};

// KEV first (observed exploitation), then by EPSS (null = unknown, sorts after
// every known score), then newest: the order the dossier table always used.
function byKevEpssDate(a: DossierCve, b: DossierCve): number {
  if (a.kev !== b.kev) return Number(b.kev) - Number(a.kev);
  if (a.epss != null || b.epss != null) {
    if (a.epss == null) return 1;
    if (b.epss == null) return -1;
    if (a.epss !== b.epss) return b.epss - a.epss;
  }
  return String(b.date ?? "").localeCompare(String(a.date ?? ""));
}

/**
 * The dossier's CVE list, split in two: the CVEs a source is cited as tying to
 * this actor (each with its quotes and links), and the ones our dispatches only
 * named alongside it. A CVE known only from cve_actor_citations still appears.
 */
export function buildDossierCves(
  rows: unknown,
  citations: unknown,
  storySlugs: ReadonlyMap<string, string> = new Map(),
  limit = 24,
): { cited: DossierCve[]; named: DossierCve[] } {
  const by = new Map<string, DossierCve & { raw: Evidence[] }>();
  const get = (cve: string) => {
    let e = by.get(cve);
    if (!e) {
      e = { cve, kev: false, epss: null, date: null, evidence: [], moreEvidence: 0, raw: [] };
      by.set(cve, e);
    }
    return e;
  };
  // Citations first: on a duplicate quote their explicit relation is the one kept.
  for (const c of asCitationDocs(citations)) {
    const cve = normCve(c.cve);
    if (!cve) continue;
    const ev = citationEvidence(c);
    // A citation with no quote or no source adds nothing: not even the CVE row.
    if (!ev) continue;
    const e = get(cve);
    e.kev ||= !!c.kev;
    e.raw.push(ev);
  }
  for (const r of asActorCveRows(rows)) {
    const cve = normCve(r.cve);
    if (!cve) continue;
    const e = get(cve);
    e.kev ||= !!r.kev;
    if (r.epss != null && (e.epss == null || r.epss > e.epss)) e.epss = r.epss;
    const d = isoDate(r.date);
    if (d && (!e.date || d > e.date)) e.date = d;
    const ev = rowEvidence(r, storySlugs);
    if (ev) e.raw.push(ev);
  }
  const cited: DossierCve[] = [];
  const named: DossierCve[] = [];
  for (const { raw, ...e } of by.values()) {
    const { shown, more } = rankEvidence(raw);
    const out = { ...e, evidence: shown, moreEvidence: more };
    if (!out.date && shown[0]?.date) out.date = shown[0].date;
    (shown.length ? cited : named).push(out);
  }
  cited.sort(byKevEpssDate);
  named.sort(byKevEpssDate);
  return { cited: cited.slice(0, limit), named: named.slice(0, limit) };
}

export type CveActorGroup = {
  actorId: string;
  name: string;
  kev: boolean;
  evidence: Evidence[];
  moreEvidence: number;
};

/**
 * The CVE page's cited actors: citations grouped per CANONICAL actor (so
 * nobelium and unc2452 rows land under apt29, once), each actor's quotes
 * ranked by rankEvidence, actors ordered by their newest citation. `names` is
 * the roster's display name per canonical id; the extractor's actor_text is
 * the fallback, then the id itself.
 */
export function groupCitationsByActor(
  citations: unknown,
  names: ReadonlyMap<string, string> = new Map(),
): CveActorGroup[] {
  const by = new Map<string, { kev: boolean; text: string | null; raw: Evidence[] }>();
  for (const c of displayableCitations(citations)) {
    const id = citationActorId(c.actor_id);
    const ev = citationEvidence(c);
    if (!ev) continue;
    let g = by.get(id);
    if (!g) {
      g = { kev: false, text: null, raw: [] };
      by.set(id, g);
    }
    g.kev ||= !!c.kev;
    g.text ||= (c.actor_text ?? "").trim() || null;
    g.raw.push(ev);
  }
  const out: CveActorGroup[] = [];
  for (const [actorId, g] of by) {
    const { shown, more } = rankEvidence(g.raw);
    out.push({ actorId, name: names.get(actorId) ?? g.text ?? actorId, kev: g.kev, evidence: shown, moreEvidence: more });
  }
  out.sort(
    (a, b) =>
      String(b.evidence[0]?.date ?? "").localeCompare(String(a.evidence[0]?.date ?? "")) || a.name.localeCompare(b.name),
  );
  return out;
}

export type PublicCitation = {
  cve: string;
  /** Canonical actor id (an alias such as nobelium is served as apt29). */
  actor_id: string;
  actor_text: string | null;
  actor_url: string;
  relation: CitationRelation;
  quote: string;
  /** true: the quote names the actor; false: the actor is named near it (or the row does not say). */
  actor_in_quote: boolean;
  source_url: string;
  host: string;
  kind: string | null;
  kev: boolean;
  extracted_at: string | null;
  extracted_by: string | null;
};

/** The API row: only citations that carry both a quote and a source url. The quote is not truncated. */
export function toPublicCitation(raw: unknown, actorUrl: (id: string) => string): PublicCitation | null {
  const doc = asCitationDoc(raw);
  if (!doc) return null;
  const cve = normCve(doc.cve);
  const id = citationActorId(doc.actor_id);
  const quote = cleanQuote(doc.quote, Infinity);
  const url = safeUrl(doc.url);
  if (!cve || !id || !quote || !url) return null;
  return {
    cve,
    actor_id: id,
    actor_text: (doc.actor_text ?? "").trim() || null,
    actor_url: actorUrl(id),
    relation: relationOf(doc.relation),
    quote,
    actor_in_quote: doc.actor_in_quote === true,
    source_url: url,
    host: (doc.host ?? "").trim() || hostOf(url),
    kind: doc.kind ?? null,
    kev: !!doc.kev,
    extracted_at: isoDate(doc.extracted_at),
    extracted_by: doc.model ?? null,
  };
}

/** API rows for one CVE: quote-named citations first, then the read's newest-first order. */
export function toPublicCitations(docs: unknown, actorUrl: (id: string) => string): PublicCitation[] {
  const rows = (Array.isArray(docs) ? docs : [])
    .map((d) => toPublicCitation(d, actorUrl))
    .filter((c): c is PublicCitation => c !== null);
  // Array.prototype.sort is stable, so newest-first holds within each half.
  return rows.sort((a, b) => Number(b.actor_in_quote) - Number(a.actor_in_quote));
}

// ---- Capped reads -----------------------------------------------------------
// A flat "newest 200" read let one hot CVE (or one prolific actor) fill the
// whole cap, so on a busy actor like APT28 every other cited CVE vanished.
// The read groups FIRST, keeps the newest `perGroup` citations of each group,
// then caps the number of groups. Pure so the stage order is unit-tested
// (tests/citations.test.ts); lib/citations-db.ts runs it.
export const CITATION_PROJECTION = {
  cve: 1,
  actor_id: 1,
  actor_text: 1,
  relation: 1,
  quote: 1,
  url: 1,
  host: 1,
  kind: 1,
  model: 1,
  extracted_at: 1,
  kev: 1,
  actor_in_quote: 1,
} as const;

export function cappedCitationsPipeline(
  match: Record<string, unknown>,
  groupBy: "cve" | "actor_id",
  maxGroups: number,
  perGroup: number,
): Record<string, unknown>[] {
  return [
    { $match: match },
    // Keeps a malformed document from failing $trim/$toUpper below. The
    // aggregation $type, not a query {$type: "string"}: the query form also
    // matches an ARRAY holding a string, and $trim then throws on it.
    { $match: { $expr: { $and: [{ $eq: [{ $type: "$cve" }, "string"] }, { $eq: [{ $type: "$actor_id" }, "string"] }] } } },
    { $sort: { extracted_at: -1 } },
    { $project: CITATION_PROJECTION },
    {
      $group: {
        _id: groupBy === "cve" ? { $toUpper: { $trim: { input: "$cve" } } } : { $toLower: { $trim: { input: "$actor_id" } } },
        newest: { $first: "$extracted_at" },
        docs: { $push: "$$ROOT" },
      },
    },
    { $sort: { newest: -1, _id: 1 } },
    { $limit: maxGroups },
    { $project: { docs: { $slice: ["$docs", perGroup] } } },
    { $unwind: "$docs" },
    { $replaceRoot: { newRoot: "$docs" } },
  ];
}
