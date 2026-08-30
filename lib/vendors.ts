import { getDb } from "./db";

// Read-only view of the engine's `vendor_intel` collection — ~373 grounded
// per-vendor security hubs built by the DO enrichment pass from skopnix's own CVE
// reporting. Each doc's `_id` IS already a clean, unique ASCII slug (verified:
// all 373 match /^[a-z0-9-]+$/, zero collisions, identical in shape to
// slugifyTerm's output — e.g. "fortinet", "bank-of-america"), so we reuse it
// verbatim as the /vendor/<slug> URL rather than inventing a divergent scheme
// (same stance sector_intel takes with its slug _id). This layer only shapes,
// guards and links the data — nothing is invented here.
//
// A vendor's CVE set is the UNION of two grounded fields, deduped:
//   • `cve_ids`  — the vendor's fuller CVE catalogue (every id resolves to a
//                   cve_intel explainer).
//   • `item_ids` — the source items this doc was built from; the `cve:`-prefixed
//                   entries are recent-coverage CVEs the catalogue can miss (e.g.
//                   admidio carries 0 cve_ids but 10 `cve:` item_ids). Verified:
//                   these item-only CVEs name the vendor in their own explainer,
//                   and every id from both fields has a /cve/<id> page. `item_ids`
//                   also carries `url:` source entries — those are ignored here.

const CVE_RE = /^CVE-\d{4}-\d{4,}$/;
const SLUG_RE = /^[a-z0-9-]+$/;

export type VendorSummary = { slug: string; name: string; cveCount: number };
export type VendorRef = { slug: string; name: string };
export type Vendor = {
  slug: string;
  name: string;
  az: string;
  en: string;
  cves: string[]; // canonical uppercase CVE ids, deduped, newest-first
};

type VendorDoc = {
  _id: string;
  vendor?: string;
  az?: string;
  en?: string;
  cve_ids?: unknown;
  item_ids?: unknown;
};

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// year desc, then sequence desc → newest CVE first (numeric, not string, so
// CVE-2024-10000 correctly sorts ahead of CVE-2024-9999).
function cveNewestCmp(a: string, b: string): number {
  const ma = /^CVE-(\d{4})-(\d+)$/.exec(a);
  const mb = /^CVE-(\d{4})-(\d+)$/.exec(b);
  const ay = ma ? +ma[1] : 0;
  const aseq = ma ? +ma[2] : 0;
  const by = mb ? +mb[1] : 0;
  const bseq = mb ? +mb[2] : 0;
  return by - ay || bseq - aseq;
}

function collectCves(cveIds: unknown, itemIds: unknown): string[] {
  const set = new Set<string>();
  if (Array.isArray(cveIds)) {
    for (const x of cveIds) {
      if (typeof x !== "string") continue;
      const s = x.trim().toUpperCase();
      if (CVE_RE.test(s)) set.add(s);
    }
  }
  if (Array.isArray(itemIds)) {
    for (const x of itemIds) {
      if (typeof x !== "string") continue;
      const m = /^cve:(.+)$/i.exec(x.trim()); // skip url: (and any non-cve) items
      if (!m) continue;
      const s = m[1].trim().toUpperCase();
      if (CVE_RE.test(s)) set.add(s);
    }
  }
  return [...set].sort(cveNewestCmp);
}

function shape(doc: VendorDoc): Vendor | null {
  const slug = str(doc._id);
  const name = str(doc.vendor);
  const az = str(doc.az);
  const en = str(doc.en);
  // A real, indexable hub needs a clean stable slug, a display name and at least
  // one overview. Verified: all 373 satisfy this, so nothing is excluded in
  // practice — the guard just keeps the contract if the collection ever drifts.
  if (!slug || !SLUG_RE.test(slug) || !name || (!az && !en)) return null;
  return { slug, name, az, en, cves: collectCves(doc.cve_ids, doc.item_ids) };
}

// The roster refreshes on the engine's cadence — cache it so the index, the hubs
// and generateStaticParams don't each re-hit Mongo during a build.
let cache: { at: number; list: Vendor[] } | null = null;
const TTL_MS = 60 * 60_000;

async function allVendors(): Promise<Vendor[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.list;
  let list: Vendor[] = [];
  try {
    const db = await getDb();
    const docs = await db.collection<VendorDoc>("vendor_intel").find({}).toArray();
    const bySlug = new Map<string, Vendor>();
    for (const d of docs) {
      const v = shape(d);
      if (v && !bySlug.has(v.slug)) bySlug.set(v.slug, v); // dedupe → zero-dup params
    }
    list = [...bySlug.values()];
  } catch {
    list = []; // DB unreachable → callers render their empty state.
  }
  cache = { at: Date.now(), list };
  return list;
}

// Index / wiring summary — most CVEs first (the honest "biggest first" default),
// then name. Used by the index grid and the main session's nav/sitemap wiring.
export async function getVendors(): Promise<VendorSummary[]> {
  const list = await allVendors();
  return list
    .map((v) => ({ slug: v.slug, name: v.name, cveCount: v.cves.length }))
    .sort((a, b) => b.cveCount - a.cveCount || a.name.localeCompare(b.name, "en"));
}

export async function getVendor(slug: string): Promise<Vendor | null> {
  const list = await allVendors();
  return list.find((v) => v.slug === slug) ?? null;
}

// Unique slugs for generateStaticParams / sitemap (Set guards the zero-dup
// contract regardless of source data).
export async function getVendorSlugs(): Promise<string[]> {
  const list = await allVendors();
  return [...new Set(list.map((v) => v.slug))];
}

// Reverse index CVE → vendors that list it, so a /cve/<id> page can carry a
// "vendor:" chip. Built once from the SAME union each hub renders (kept
// consistent so a chip always leads to a hub that lists that CVE), cached
// alongside the roster. Names sorted for a stable chip order.
let reverseCache: { at: number; map: Map<string, VendorRef[]> } | null = null;

async function reverseIndex(): Promise<Map<string, VendorRef[]>> {
  if (reverseCache && Date.now() - reverseCache.at < TTL_MS) return reverseCache.map;
  const list = await allVendors();
  const map = new Map<string, VendorRef[]>();
  for (const v of list) {
    const ref: VendorRef = { slug: v.slug, name: v.name };
    for (const cve of v.cves) {
      const arr = map.get(cve);
      if (arr) arr.push(ref);
      else map.set(cve, [ref]);
    }
  }
  for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name, "en"));
  reverseCache = { at: Date.now(), map };
  return map;
}

export async function getVendorsForCve(cveId: string): Promise<VendorRef[]> {
  const id = str(cveId).toUpperCase();
  if (!CVE_RE.test(id)) return [];
  return (await reverseIndex()).get(id) ?? [];
}
