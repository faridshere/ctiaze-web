import { absoluteUrl, SITE_NAME } from "./site";
import { navigatorTactic } from "./navigator";
import {
  attackTechniqueUrl,
  CREATED,
  IDENTITY_ID,
  MARKINGS,
  TLP_WHITE,
  intrusionSetFor,
  iso,
  refSourceName,
  skopnixIdentity,
  stixId,
  uuid5,
  type StixBundle,
  type StixObject,
} from "./stix";
import type { ThreatActor } from "./threatactors";
import type { ClaimRow } from "./claims";

// ---------------------------------------------------------------------------
// Cited intelligence as STIX 2.1 — the transforms behind /api/v1/stix/*, the
// TAXII collections and (for IOC normalisation) the MISP feed.
//
// "Cited" is the whole point: every relationship here is one sentence in one
// published report that ties an actor to a CVE, a technique or an indicator.
// The sentence goes in the relationship's description and in its
// external_reference next to the URL, so a consumer can check our reading
// instead of trusting it. A row with no usable source URL is never emitted
// (plan §13.3: no attribution row without a source URL).
//
// Pure functions over plain rows. Like lib/stix.ts, only type-level imports
// reach the data modules (./threatactors and ./claims import ./db), so this
// file is importable — and tested — without a database.
// ---------------------------------------------------------------------------

/** cve_actor_citations: a source sentence tying an actor to a CVE. */
export type CveCitation = {
  _id?: unknown;
  cve: string;
  actor_id: string | null;
  actor_text?: string | null;
  // True when the quoted sentence itself names the actor; false when the
  // actor comes from elsewhere in the same report.
  actor_in_quote?: boolean | null;
  relation?: string | null;
  quote?: string | null;
  url?: string | null;
  host?: string | null;
  kev?: boolean | null;
  extracted_at?: Date | string | null;
};

/** actor_ttps_cited: a source sentence tying an actor to an ATT&CK technique. */
export type TtpCitation = {
  _id?: unknown;
  actor_id: string;
  technique_id: string;
  technique_name?: string | null;
  tactic?: string | null;
  quote?: string | null;
  url?: string | null;
  actor_in_quote?: boolean | null;
  extracted_at?: Date | string | null;
};

export type IocKind = "sha256" | "sha1" | "md5" | "domain" | "ip" | "url" | "email" | "filename";

/** actor_iocs_cited: a source sentence tying an actor to an indicator. */
export type IocCitation = {
  _id?: unknown;
  actor_id: string;
  type: IocKind | string;
  value: string;
  quote?: string | null;
  url?: string | null;
  actor_in_quote?: boolean | null;
  extracted_at?: Date | string | null;
};

export type CitedRows = { cves: CveCitation[]; ttps: TtpCitation[]; iocs: IocCitation[] };

// STIX 2.1 Appendix A, "High / Med / Low" scale: High = 85, Med = 50. A
// quote that names the actor itself is the stronger reading; one where the
// actor comes from the surrounding report is weaker, not wrong. Absent the
// flag the property is omitted — in STIX that means "unknown", which is the
// truth, rather than a number we would be making up.
export const CONFIDENCE_ACTOR_IN_QUOTE = 85;
export const CONFIDENCE_ACTOR_IN_REPORT = 50;
// A hacktivist claim is someone else's unverified boast: Low = 15.
export const CONFIDENCE_CLAIM = 15;

const MAX_QUOTE = 2000;

// The exact CVE id grammar the STIX 2.1 schema enforces on a `cve` reference.
const CVE_ID = /^CVE-\d{4}-(0\d{3}|[1-9]\d{3,})$/;
const TECHNIQUE_ID = /^T\d{4}(\.\d{3})?$/;

/** Upper-cased CVE id, or null when it is not one. */
export function normalizeCve(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toUpperCase();
  return CVE_ID.test(v) ? v : null;
}

// ObjectIds carry their creation second in the first four bytes. Read without
// importing the driver: a live ObjectId exposes getTimestamp(), and a hex
// string of the right shape is the same thing serialised.
function objectIdTime(id: unknown): string | null {
  if (id && typeof id === "object" && "getTimestamp" in id && typeof id.getTimestamp === "function") {
    return iso(id.getTimestamp() as Date);
  }
  if (typeof id === "string" && /^[0-9a-f]{24}$/i.test(id)) {
    return new Date(parseInt(id.slice(0, 8), 16) * 1000).toISOString();
  }
  return null;
}

/**
 * When we recorded a citation: its extracted_at, else the second its row was
 * inserted (ObjectId), else the day skopnix started publishing STIX. This is
 * the TAXII date_added, so it must never be "now".
 */
export function citedAt(row: { _id?: unknown; extracted_at?: Date | string | null }): string {
  return iso(row.extracted_at) ?? objectIdTime(row._id) ?? CREATED;
}

/** The source URL if it is a real http(s) URL, else null. */
export function sourceUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!/^https?:\/\//i.test(v)) return null;
  try {
    return new URL(v).href;
  } catch {
    return null;
  }
}

function cleanQuote(q: string | null | undefined): string | null {
  const v = (q ?? "").replace(/\s+/g, " ").trim();
  if (!v) return null;
  return v.length > MAX_QUOTE ? `${v.slice(0, MAX_QUOTE - 1)}…` : v;
}

function confidenceOf(actorInQuote: boolean | null | undefined): number | undefined {
  if (actorInQuote === true) return CONFIDENCE_ACTOR_IN_QUOTE;
  if (actorInQuote === false) return CONFIDENCE_ACTOR_IN_REPORT;
  return undefined;
}

// --- indicators ---------------------------------------------------------------

export type NormalizedIoc =
  | { kind: "sha256" | "sha1" | "md5"; value: string }
  | { kind: "domain" | "url" | "email" | "filename"; value: string }
  | { kind: "ipv4" | "ipv6"; value: string };

// Reports defang indicators so nobody clicks them; a pattern needs the live
// value back. Only the conventional, unambiguous forms.
function refang(s: string): string {
  return s
    .trim()
    .replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]/gi, ".")
    .replace(/\[@\]|\[at\]/gi, "@")
    .replace(/\[:\]/g, ":")
    .replace(/^hxxp(s?):\/\//i, "http$1://")
    .replace(/^(https?)\[:\]\/\//i, "$1://");
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;
const EMAIL = /^[^\s@]{1,64}@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function isIpv6(v: string): boolean {
  if (!v.includes(":") || !/^[0-9a-f:.]+$/i.test(v)) return false;
  try {
    return new URL(`http://[${v}]/`).hostname.length > 2;
  } catch {
    return false;
  }
}

/**
 * The indicator, refanged and checked against its own type — or null. A
 * value that is not what its row says it is (a "sha256" of 40 characters, a
 * "domain" with a space) is dropped, never emitted as a pattern that would
 * match nothing or, worse, something else.
 */
export function normalizeIoc(type: string, raw: string): NormalizedIoc | null {
  const v = refang(raw ?? "");
  if (!v || v.length > 2048) return null;
  switch (type) {
    case "sha256":
    case "sha1":
    case "md5": {
      const len = { sha256: 64, sha1: 40, md5: 32 }[type];
      const h = v.toLowerCase();
      return new RegExp(`^[0-9a-f]{${len}}$`).test(h) ? { kind: type, value: h } : null;
    }
    case "ip":
      if (IPV4.test(v)) return { kind: "ipv4", value: v };
      return isIpv6(v) ? { kind: "ipv6", value: v.toLowerCase() } : null;
    case "domain": {
      const d = v.toLowerCase().replace(/\.$/, "");
      return DOMAIN.test(d) ? { kind: "domain", value: d } : null;
    }
    case "url":
      return sourceUrl(v) ? { kind: "url", value: v } : null;
    case "email": {
      const e = v.toLowerCase();
      return EMAIL.test(e) ? { kind: "email", value: e } : null;
    }
    case "filename":
      return /^[^\\/\0\r\n]{1,255}$/.test(v) ? { kind: "filename", value: v } : null;
    default:
      return null;
  }
}

// STIX patterning string literal: backslash and single quote are the only
// characters that need escaping (STIX 2.1 §9.4).
const lit = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/** The STIX pattern that matches this indicator. */
export function stixPattern(ioc: NormalizedIoc): string {
  switch (ioc.kind) {
    case "sha256":
      return `[file:hashes.'SHA-256' = ${lit(ioc.value)}]`;
    case "sha1":
      return `[file:hashes.'SHA-1' = ${lit(ioc.value)}]`;
    case "md5":
      return `[file:hashes.MD5 = ${lit(ioc.value)}]`;
    case "ipv4":
      return `[ipv4-addr:value = ${lit(ioc.value)}]`;
    case "ipv6":
      return `[ipv6-addr:value = ${lit(ioc.value)}]`;
    case "domain":
      return `[domain-name:value = ${lit(ioc.value)}]`;
    case "url":
      return `[url:value = ${lit(ioc.value)}]`;
    case "email":
      return `[email-addr:value = ${lit(ioc.value)}]`;
    case "filename":
      return `[file:name = ${lit(ioc.value)}]`;
  }
}

// --- shared objects -----------------------------------------------------------

// Objects that are facts about the world rather than about one actor (a CVE,
// an ATT&CK technique, an indicator) are shared across every export, so their
// content must not depend on which rows a response happened to include:
// created and modified are pinned to CREATED, and per-citation detail (KEV,
// the quote, the date) lives on the relationship instead.
const SHARED = {
  spec_version: "2.1" as const,
  created: CREATED,
  modified: CREATED,
  created_by_ref: IDENTITY_ID,
  object_marking_refs: MARKINGS,
};

export function vulnerabilityFor(cve: string): StixObject {
  return {
    type: "vulnerability",
    ...SHARED,
    id: stixId("vulnerability", cve),
    name: cve,
    external_references: [
      { source_name: "cve", external_id: cve, url: `https://www.cve.org/CVERecord?id=${cve}` },
    ],
  };
}

/** Same id as the dossier bundle's attack-pattern for this technique. */
export function attackPatternFor(id: string, name: string | null | undefined, tactic: string | null | undefined): StixObject {
  const phase = navigatorTactic(tactic);
  return {
    type: "attack-pattern",
    ...SHARED,
    id: stixId("attack-pattern", id),
    name: (name ?? "").trim() || id,
    external_references: [{ source_name: "mitre-attack", external_id: id, url: attackTechniqueUrl(id) }],
    ...(phase ? { kill_chain_phases: [{ kill_chain_name: "mitre-attack", phase_name: phase }] } : {}),
  };
}

/** One indicator per (kind, value), shared by every actor it is cited for. */
export function indicatorFor(ioc: NormalizedIoc): StixObject {
  return {
    type: "indicator",
    ...SHARED,
    id: stixId("indicator", `${ioc.kind}:${ioc.value}`),
    name: ioc.value,
    indicator_types: ["malicious-activity"],
    pattern: stixPattern(ioc),
    pattern_type: "stix",
    // When skopnix began publishing, not when the indicator went live — we do
    // not know that, and a shared object cannot take one citation's date.
    valid_from: CREATED,
  };
}

// --- assertions ---------------------------------------------------------------

/**
 * One cited claim, before it becomes objects: "the report at `url` says, in
 * `quote`, that `actor` <relationship_type> `target`". `actorIsSource` is
 * false only for `indicates`, where STIX puts the indicator first.
 */
export type Assertion = {
  relationshipType: "exploits" | "uses" | "indicates";
  actor: ThreatActor;
  target: StixObject;
  actorIsSource: boolean;
  url: string;
  host: string;
  quote: string | null;
  at: string;
  confidence?: number;
  custom?: Record<`x_${string}`, unknown>;
};

export function cveAssertion(row: CveCitation, actor: ThreatActor): Assertion | null {
  const cve = normalizeCve(row.cve);
  const url = sourceUrl(row.url);
  if (!cve || !url) return null;
  const custom: Record<`x_${string}`, unknown> = {};
  if (row.relation) custom.x_skopnix_relation = String(row.relation);
  if (typeof row.actor_in_quote === "boolean") custom.x_skopnix_actor_in_quote = row.actor_in_quote;
  if (row.kev === true) custom.x_skopnix_kev = true;
  return {
    // Not one of STIX's suggested intrusion-set → vulnerability verbs (that is
    // `targets`); custom relationship types are allowed, and "exploits" is
    // what the source sentence actually says. See the API docs.
    relationshipType: "exploits",
    actor,
    target: vulnerabilityFor(cve),
    actorIsSource: true,
    url,
    host: (row.host ?? "").trim() || refSourceName(url),
    quote: cleanQuote(row.quote),
    at: citedAt(row),
    confidence: confidenceOf(row.actor_in_quote),
    custom,
  };
}

export function ttpAssertion(row: TtpCitation, actor: ThreatActor): Assertion | null {
  const id = (row.technique_id ?? "").trim().toUpperCase();
  const url = sourceUrl(row.url);
  if (!TECHNIQUE_ID.test(id) || !url) return null;
  return {
    relationshipType: "uses",
    actor,
    target: attackPatternFor(id, row.technique_name, row.tactic),
    actorIsSource: true,
    url,
    host: refSourceName(url),
    quote: cleanQuote(row.quote),
    at: citedAt(row),
    confidence: confidenceOf(row.actor_in_quote),
  };
}

export function iocAssertion(row: IocCitation, actor: ThreatActor): Assertion | null {
  const ioc = normalizeIoc(row.type, row.value);
  const url = sourceUrl(row.url);
  if (!ioc || !url) return null;
  return {
    relationshipType: "indicates",
    actor,
    target: indicatorFor(ioc),
    actorIsSource: false,
    url,
    host: refSourceName(url),
    quote: cleanQuote(row.quote),
    at: citedAt(row),
    confidence: confidenceOf(row.actor_in_quote),
  };
}

/** Every assertion the rows support for actors we hold a dossier for. */
export function assertionsFor(rows: CitedRows, actors: Map<string, ThreatActor>): Assertion[] {
  const out: Assertion[] = [];
  const push = (a: Assertion | null) => {
    if (a) out.push(a);
  };
  for (const r of rows.cves) {
    const a = r.actor_id ? actors.get(r.actor_id) : undefined;
    if (a) push(cveAssertion(r, a));
  }
  for (const r of rows.ttps) {
    const a = actors.get(r.actor_id);
    if (a) push(ttpAssertion(r, a));
  }
  for (const r of rows.iocs) {
    const a = actors.get(r.actor_id);
    if (a) push(iocAssertion(r, a));
  }
  return out;
}

/**
 * The relationship for one assertion. Its id is keyed on the source URL too:
 * two reports saying the same thing are two pieces of evidence, each with its
 * own quote and confidence, and STIX allows any number of relationships
 * between the same pair of objects.
 */
export function relationshipFor(a: Assertion, intrusionSetId: string): StixObject {
  const [source, target] = a.actorIsSource ? [intrusionSetId, a.target.id] : [a.target.id, intrusionSetId];
  return {
    type: "relationship",
    spec_version: "2.1",
    id: stixId("relationship", `cited:${a.relationshipType}:${source}:${target}:${a.url}`),
    created: a.at,
    modified: a.at,
    created_by_ref: IDENTITY_ID,
    object_marking_refs: MARKINGS,
    relationship_type: a.relationshipType,
    source_ref: source,
    target_ref: target,
    ...(a.quote ? { description: a.quote } : {}),
    ...(a.confidence !== undefined ? { confidence: a.confidence } : {}),
    external_references: [
      { source_name: a.host, url: a.url, ...(a.quote ? { description: a.quote } : {}) },
    ],
    ...(a.custom ?? {}),
  };
}

/** A date-stamped object as a TAXII collection holds it. */
export type DatedObject = { object: StixObject; dateAdded: string };

/**
 * Assertions to objects, each referenced object once and before anything that
 * references it: marking and identity, then the intrusion-sets, then the
 * targets, then the relationships. Attack-patterns cited under several tactics
 * collect every phase, as in the dossier bundle.
 */
export function objectsFor(assertions: Assertion[]): DatedObject[] {
  const sets = new Map<string, DatedObject>();
  const targets = new Map<string, DatedObject>();
  const rels = new Map<string, DatedObject>();
  for (const a of assertions) {
    const set = intrusionSetFor(a.actor);
    const prevSet = sets.get(set.id);
    if (!prevSet || a.at < prevSet.dateAdded) sets.set(set.id, { object: set, dateAdded: a.at });

    const prev = targets.get(a.target.id);
    if (!prev) {
      targets.set(a.target.id, { object: a.target, dateAdded: a.at });
    } else {
      if (a.at < prev.dateAdded) prev.dateAdded = a.at;
      const phases = a.target.kill_chain_phases ?? [];
      for (const p of phases) {
        const have = prev.object.kill_chain_phases ?? [];
        if (!have.some((h) => h.phase_name === p.phase_name)) {
          prev.object = { ...prev.object, kill_chain_phases: [...have, p] };
        }
      }
    }

    const rel = relationshipFor(a, set.id);
    // The same report quoted twice for the same link is one relationship:
    // keep the earliest reading.
    if (!rels.has(rel.id)) rels.set(rel.id, { object: rel, dateAdded: a.at });
  }
  return [...sets.values(), ...targets.values(), ...rels.values()];
}

const prelude = (): StixObject[] => [TLP_WHITE, skopnixIdentity()];

function bundleOf(key: string, objects: StixObject[]): StixBundle {
  return { type: "bundle", id: `bundle--${uuid5(`bundle:${key}`)}`, objects };
}

/**
 * One actor's cited intelligence as a bundle. Always carries the intrusion-set,
 * even with no citations on this page, so a page is never an empty bundle.
 */
export function citedActorBundle(actor: ThreatActor, rows: CitedRows, page = 1): StixBundle {
  const assertions = assertionsFor(rows, new Map([[actor._id, actor]]));
  const objects = objectsFor(assertions).map((d) => d.object);
  const set = intrusionSetFor(actor);
  if (!objects.some((o) => o.id === set.id)) objects.unshift(set);
  return bundleOf(`cited:actor:${actor._id}:${page}`, [...prelude(), ...objects]);
}

/** Every actor cited for one CVE, as a bundle around its vulnerability object. */
export function citedCveBundle(
  cve: string,
  rows: CveCitation[],
  actors: Map<string, ThreatActor>,
  page = 1,
): StixBundle {
  const assertions = assertionsFor({ cves: rows, ttps: [], iocs: [] }, actors);
  const objects = objectsFor(assertions).map((d) => d.object);
  const vuln = vulnerabilityFor(cve);
  if (!objects.some((o) => o.id === vuln.id)) objects.unshift(vuln);
  return bundleOf(`cited:cve:${cve}:${page}`, [...prelude(), ...objects]);
}

/** The objects every TAXII page carries so its refs resolve on their own. */
export function taxiiPrelude(): StixObject[] {
  return prelude();
}

// --- hacktivist claims ----------------------------------------------------------

const AZERBAIJAN: StixObject = {
  type: "location",
  ...SHARED,
  id: stixId("location", "country:AZ"),
  name: "Azerbaijan",
  country: "AZ",
};

/**
 * One public claim against Azerbaijan as STIX: a report (Low confidence,
 * labelled unverified-claim) referencing Azerbaijan and, for telegram and
 * leak-site rows, the claimant as a threat-actor. Bluesky rows are trackers
 * reposting someone else's claim, so their "group" is the tracker and is not
 * turned into a threat-actor.
 */
export function claimObjects(c: ClaimRow): StixObject[] {
  const out: StixObject[] = [];
  const refs = [AZERBAIJAN.id];
  const group = (c.group ?? "").trim();
  if (c.kind !== "bluesky" && group && group !== "unknown") {
    const actor: StixObject = {
      type: "threat-actor",
      ...SHARED,
      id: stixId("threat-actor", `claimant:${group.toLowerCase()}`),
      name: group,
      // threat-actor-type-ov has no "hacktivist"; its "activist" is the
      // politically-motivated disruptor, and the label keeps the plain word.
      threat_actor_types: [c.kind === "ransomware" ? "crime-syndicate" : "activist"],
      labels: [c.kind === "ransomware" ? "ransomware" : "hacktivist"],
    };
    out.push(actor);
    refs.unshift(actor.id);
  }
  const url = sourceUrl(c.url);
  const text = cleanQuote(c.summaryEn) ?? cleanQuote(c.text);
  const at = iso(c.seenAt) ?? CREATED;
  out.push({
    type: "report",
    spec_version: "2.1",
    id: stixId("report", `claim:${c.id}`),
    created: at,
    modified: at,
    created_by_ref: IDENTITY_ID,
    object_marking_refs: MARKINGS,
    name: `Unverified ${c.kind} claim${group && group !== "unknown" ? ` by ${group}` : ""}${c.claimType ? ` (${c.claimType})` : ""}`,
    description: `A CLAIM made by a third party, not a confirmed incident.${text ? ` ${text}` : ""}`,
    report_types: ["threat-report"],
    published: iso(c.at) ?? at,
    labels: ["unverified-claim", c.kind],
    confidence: CONFIDENCE_CLAIM,
    object_refs: refs,
    external_references: [
      ...(url ? [{ source_name: refSourceName(url), url }] : []),
      { source_name: SITE_NAME, external_id: c.id, url: absoluteUrl("/claims") },
    ],
    ...(c.targets.length ? { x_skopnix_targets: c.targets } : {}),
  });
  return [AZERBAIJAN, ...out];
}
