import { absoluteUrl, SITE_NAME, SITE_URL } from "./site";
import { uuid5, type StixObject } from "./stix";

// ---------------------------------------------------------------------------
// A minimal, read-only TAXII 2.1 server: the pure half (media types, the
// discovery/api-root/collection resources, paging). The routes under
// app/taxii2 and app/api/v1/taxii2 add the database and HTTP.
//
// Read-only means can_write: false on every collection and no POST handlers:
// a client that tries to add objects gets Next's 405.
// ---------------------------------------------------------------------------

export const TAXII_MEDIA = "application/taxii+json;version=2.1";
export const STIX_MEDIA = "application/stix+json;version=2.1";

export const DISCOVERY_PATH = "/taxii2/";
export const API_ROOT_PATH = "/api/v1/taxii2/";

// Bounded responses: the TAXII default and ceiling for one page.
export const MAX_PAGE = 1000;
export const DEFAULT_PAGE = 1000;
// Below this the marking and identity objects would crowd out the content.
const PRELUDE_MIN_LIMIT = 10;
// One row yields at most three objects (intrusion-set, target, relationship)
// and a row is never split across pages, so a smaller page could never move.
export const MIN_PAGE = 3;

export type CollectionKey = "cited-intel" | "az-claims";

export type TaxiiCollection = {
  id: string;
  title: CollectionKey;
  description: string;
  can_read: true;
  can_write: false;
  media_types: string[];
};

// Collection ids are UUIDs (deterministic, like every other id we publish);
// the routes also accept the title in their place, which is easier to type.
export const COLLECTIONS: TaxiiCollection[] = [
  {
    id: uuid5("taxii-collection:cited-intel"),
    title: "cited-intel",
    description:
      "Actor ↔ CVE, ATT&CK technique and indicator links, each a relationship carrying the source URL and the quoted sentence it rests on. Confidence 85 when the quote names the actor, 50 when the actor comes from the surrounding report.",
    can_read: true,
    can_write: false,
    media_types: [STIX_MEDIA],
  },
  {
    id: uuid5("taxii-collection:az-claims"),
    title: "az-claims",
    description:
      "Public hacktivist and leak-site claims against Azerbaijan, as Low-confidence reports labelled unverified-claim. Every one is a third party's CLAIM, never a confirmed incident. Dark-web sources are never included.",
    can_read: true,
    can_write: false,
    media_types: [STIX_MEDIA],
  },
];

export function findCollection(idOrTitle: string): TaxiiCollection | null {
  const v = idOrTitle.trim().toLowerCase();
  return COLLECTIONS.find((c) => c.id === v || c.title === v) ?? null;
}

export function discovery() {
  return {
    title: `${SITE_NAME} TAXII`,
    description: "Read-only TAXII 2.1 server for skopnix's cited threat intelligence. No key, no account.",
    contact: SITE_URL,
    default: absoluteUrl(API_ROOT_PATH),
    api_roots: [absoluteUrl(API_ROOT_PATH)],
  };
}

export function apiRoot() {
  return {
    title: `${SITE_NAME} cited intelligence`,
    description: "Collections: cited-intel and az-claims. Read-only.",
    versions: [TAXII_MEDIA],
    // The largest request body we accept. We accept none: nothing is writable.
    max_content_length: 0,
  };
}

/** The TAXII error message resource (TAXII 2.1 §3.6.1). */
export function taxiiError(status: number, title: string, description?: string) {
  return { title, ...(description ? { description } : {}), http_status: String(status) };
}

/**
 * Whether the client accepts a TAXII 2.1 response. A missing Accept, a
 * wildcard, plain JSON (a curl or a browser) and taxii+json with no version
 * or version 2.1 all do; anything else is the 406 the spec asks for.
 */
export function acceptsTaxii(accept: string | null): boolean {
  if (!accept) return true;
  return accept.split(",").some((part) => {
    const [type, ...params] = part.split(";").map((s) => s.trim().toLowerCase());
    if (type === "*/*" || type === "application/*" || type === "application/json") return true;
    if (type !== "application/taxii+json") return false;
    const version = params.find((p) => p.startsWith("version="));
    return !version || version === "version=2.1";
  });
}

// --- paging --------------------------------------------------------------------

/**
 * A position in the merged, totally-ordered stream of rows a collection is
 * built from: (date added, source index, row id as a string). Ties on the
 * timestamp are why `added_after` alone cannot page: rows written in the same
 * second would be skipped. `next` carries the full position instead.
 */
export type Cursor = { at: string; k: number; sid: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify([c.at, c.k, c.sid]), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(v) || v.length !== 3) return null;
    const [at, k, sid] = v as [unknown, unknown, unknown];
    if (typeof at !== "string" || Number.isNaN(Date.parse(at))) return null;
    if (typeof k !== "number" || !Number.isInteger(k) || k < 0 || k > 16) return null;
    if (typeof sid !== "string" || sid.length > 200) return null;
    return { at: new Date(at).toISOString(), k, sid };
  } catch {
    return null;
  }
}

export function compareCursor(a: Cursor, b: Cursor): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  if (a.k !== b.k) return a.k - b.k;
  return a.sid < b.sid ? -1 : a.sid > b.sid ? 1 : 0;
}

export type ObjectsQuery = { addedAfter: string | null; limit: number; next: Cursor | null };

/** Parse the objects endpoint's query, or say what is wrong with it. */
export function parseObjectsQuery(params: URLSearchParams): ObjectsQuery | { error: string } {
  const rawLimit = params.get("limit");
  let limit = DEFAULT_PAGE;
  if (rawLimit !== null) {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1) return { error: "`limit` must be a positive integer." };
    limit = Math.min(MAX_PAGE, Math.max(MIN_PAGE, n));
  }
  let addedAfter: string | null = null;
  const rawAfter = params.get("added_after");
  if (rawAfter !== null) {
    // TAXII timestamps are RFC 3339 in UTC.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(rawAfter) || Number.isNaN(Date.parse(rawAfter))) {
      return { error: "`added_after` must be an RFC 3339 UTC timestamp, e.g. 2026-10-01T00:00:00.000Z." };
    }
    addedAfter = new Date(rawAfter).toISOString();
  }
  let next: Cursor | null = null;
  const rawNext = params.get("next");
  if (rawNext !== null) {
    next = decodeCursor(rawNext);
    if (!next) return { error: "`next` is not a value this server issued." };
  }
  return { addedAfter, limit, next };
}

/** The lower bound a source must read past: the later of added_after and next. */
export function streamStart(q: ObjectsQuery): Cursor | null {
  // added_after is strict: a row added exactly at that instant is excluded,
  // which a cursor of (at, +∞, +∞) expresses; k = 17 sorts after every source.
  const after: Cursor | null = q.addedAfter ? { at: q.addedAfter, k: 17, sid: "" } : null;
  if (!after) return q.next;
  if (!q.next) return after;
  return compareCursor(q.next, after) > 0 ? q.next : after;
}

/** A source row once built: its stream position and the objects it yields. */
export type StreamItem = Cursor & { objects: StixObject[] };

/** One source's rows for a page, in stream order, and whether it had more. */
export type SourceRead = { items: StreamItem[]; truncated: boolean };

/**
 * Merge per-source reads into one ordered stream, cut where it stops being
 * complete. A source that returned only its first N rows says nothing about
 * what lies past its last one, so another source's rows beyond that point
 * could have rows of the first interleaved: the stream ends at the earliest
 * such horizon. Each source reads limit + 1 rows, so the cut stream still
 * holds more rows than one page can carry.
 */
export function mergeStreams(reads: SourceRead[]): { stream: StreamItem[]; truncated: boolean } {
  let horizon: Cursor | null = null;
  for (const r of reads) {
    const last = r.items[r.items.length - 1];
    if (r.truncated && last && (!horizon || compareCursor(last, horizon) < 0)) horizon = last;
  }
  const all = reads.flatMap((r) => r.items).sort(compareCursor);
  const stream = horizon ? all.filter((i) => compareCursor(i, horizon) <= 0) : all;
  return { stream, truncated: reads.some((r) => r.truncated) || stream.length < all.length };
}

export type TaxiiPage = {
  envelope: { more: boolean; next?: string; objects?: StixObject[] };
  first: string | null;
  last: string | null;
};

/**
 * Pack an ordered stream into one envelope of at most `limit` objects. A row's
 * objects are never split across pages; an object already on this page (a
 * shared intrusion-set or CVE) is not repeated. `truncated` says the sources
 * hold rows past the end of `stream`.
 */
export function packPage(stream: StreamItem[], limit: number, prelude: StixObject[], truncated: boolean): TaxiiPage {
  const objects: StixObject[] = limit >= PRELUDE_MIN_LIMIT ? [...prelude] : [];
  const seen = new Set(objects.map((o) => o.id));
  let consumed = 0;
  for (const item of stream) {
    const fresh = item.objects.filter((o) => !seen.has(o.id));
    if (objects.length + fresh.length > limit) break;
    for (const o of fresh) {
      seen.add(o.id);
      objects.push(o);
    }
    consumed++;
  }
  const taken = stream.slice(0, consumed);
  const lastItem = taken[taken.length - 1];
  const more = Boolean(lastItem) && (consumed < stream.length || truncated);
  return {
    envelope: {
      more,
      ...(more && lastItem ? { next: encodeCursor(lastItem) } : {}),
      ...(taken.length ? { objects } : {}),
    },
    first: taken[0]?.at ?? null,
    last: lastItem?.at ?? null,
  };
}
