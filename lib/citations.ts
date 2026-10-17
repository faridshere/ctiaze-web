import { slugify } from "./slug";

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
// ---------------------------------------------------------------------------

export type CitationRelation = "exploited" | "used_in_campaign" | "attributed_by_report";

/** A cve_actor_citations document as the engine writes it. */
export type CveActorCitationDoc = {
  _id: string;
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
};

export const MAX_EVIDENCE = 5;
// A verbatim quote is printed whole up to this length; past it the tail is cut
// with an ellipsis so one runaway extraction cannot take over the page.
export const MAX_QUOTE = 480;

const CVE_RE = /^CVE-\d{4}-\d{4,7}$/;

export function normCve(id: string | null | undefined): string | null {
  const u = (id ?? "").trim().toUpperCase();
  return CVE_RE.test(u) ? u : null;
}

export function relationOf(r: string | null | undefined): CitationRelation {
  return r === "used_in_campaign" || r === "attributed_by_report" ? r : "exploited";
}

/** The phrase a page prints for a relation. Never "confirmed". */
export function relationLabel(r: CitationRelation): string {
  if (r === "used_in_campaign") return "cited as used in a campaign";
  if (r === "attributed_by_report") return "attributed by a report";
  return "cited as exploiting";
}

export function cleanQuote(q: string | null | undefined, max = MAX_QUOTE): string | null {
  const t = (q ?? "").replace(/\s+/g, " ").trim();
  if (t.length < 8) return null;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** An http(s) url, or null. A javascript:/data: or relative value is dropped. */
export function safeUrl(u: string | null | undefined): string | null {
  const s = (u ?? "").trim();
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

/** Our own dispatch for an engine story id, or null when it is not one. */
export function storyHref(item: string | null | undefined): string | null {
  const id = (item ?? "").trim();
  if (!/^(cve:|url:|digest:|spike:)\S{4,}$/.test(id)) return null;
  // The first 12 chars of the slug address the story; /news/<key> 308s to the
  // canonical title slug (app/news/[slug]/page.tsx), so no title is needed here.
  return `/news/${slugify(id, "")}`;
}

export function isoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** A citation document as evidence, or null when it lacks a quote or a source. */
export function citationEvidence(doc: CveActorCitationDoc): Evidence | null {
  const quote = cleanQuote(doc.quote);
  const href = safeUrl(doc.url);
  if (!quote || !href) return null;
  return {
    quote,
    href,
    sourceLabel: (doc.host || "").replace(/^www\./, "") || hostOf(href),
    external: true,
    relation: relationOf(doc.relation),
    date: isoDate(doc.extracted_at),
  };
}

/** A dossier CVE row as evidence: its url if present, else our story link. */
export function rowEvidence(row: ActorCveRow): Evidence | null {
  const quote = cleanQuote(row.evidence);
  if (!quote) return null;
  const url = safeUrl(row.url);
  const story = url ? null : storyHref(row.item);
  const href = url ?? story;
  if (!href) return null;
  const src = (row.source ?? "").replace(/^report:/, "").replace(/^www\./, "");
  return {
    quote,
    href,
    sourceLabel: url ? src || hostOf(url) : "our dispatch",
    external: !!url,
    // The dossier row has no relation field; it lives in the list of CVEs the
    // engine ties to this actor, which the page prints as "cited as exploiting".
    relation: "exploited",
    date: isoDate(row.date),
  };
}

// Same quote from the same source, written once to the dossier row and once to
// cve_actor_citations, must print once.
function evidenceKey(e: Evidence): string {
  return `${e.href.replace(/\/+$/, "").toLowerCase()}|${e.quote.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 120)}`;
}

/** Dedupe, newest first (undated last), capped. Returns the shown list and how many were left out. */
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
  rows: ActorCveRow[] | null | undefined,
  citations: CveActorCitationDoc[] | null | undefined,
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
  for (const c of citations ?? []) {
    const cve = normCve(c.cve);
    if (!cve) continue;
    const ev = citationEvidence(c);
    // A citation with no quote or no source adds nothing: not even the CVE row.
    if (!ev) continue;
    const e = get(cve);
    e.kev ||= !!c.kev;
    e.raw.push(ev);
  }
  for (const r of rows ?? []) {
    const cve = normCve(r.cve);
    if (!cve) continue;
    const e = get(cve);
    e.kev ||= !!r.kev;
    if (r.epss != null && (e.epss == null || r.epss > e.epss)) e.epss = r.epss;
    const d = isoDate(r.date);
    if (d && (!e.date || d > e.date)) e.date = d;
    const ev = rowEvidence(r);
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
 * The CVE page's "Cited as exploited by": citations grouped per actor, each
 * actor's quotes newest first, actors ordered by their newest citation. `names`
 * is the roster's display name per id; the extractor's actor_text is the
 * fallback, then the id itself.
 */
export function groupCitationsByActor(
  citations: CveActorCitationDoc[] | null | undefined,
  names: Map<string, string> = new Map(),
): CveActorGroup[] {
  const by = new Map<string, { kev: boolean; text: string | null; raw: Evidence[] }>();
  for (const c of citations ?? []) {
    const id = (c.actor_id ?? "").trim();
    if (!id) continue;
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
  actor_id: string;
  actor_text: string | null;
  actor_url: string;
  relation: CitationRelation;
  quote: string;
  source_url: string;
  host: string;
  kind: string | null;
  kev: boolean;
  extracted_at: string | null;
  extracted_by: string | null;
};

/** The API row: only citations that carry both a quote and a source url. The quote is not truncated. */
export function toPublicCitation(doc: CveActorCitationDoc, actorUrl: (id: string) => string): PublicCitation | null {
  const cve = normCve(doc.cve);
  const id = (doc.actor_id ?? "").trim();
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
    source_url: url,
    host: (doc.host || "").trim() || hostOf(url),
    kind: doc.kind ?? null,
    kev: !!doc.kev,
    extracted_at: isoDate(doc.extracted_at),
    extracted_by: doc.model ?? null,
  };
}
