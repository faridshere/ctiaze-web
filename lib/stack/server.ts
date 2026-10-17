import { getDb } from "../db";
import { epssMap } from "../cveintel";
import { ttlMemo } from "../memo";
import type { ActorClaim, ActorCveRow, Component, ComponentResult, CpeMatch, CpePart, ProductCve, Resolved } from "./types";
import { resolveComponent, type KevName } from "./resolve";
import { cpeName } from "./ids";
import { actorClaims, assessComponent, cpeMatchesOf, kevByName, matchesFor, mergeClaims, type CveFacts, type KevEntry, type NvdPull } from "./match";

// Server-only I/O for the stack check: the CISA KEV catalog, NVD CVE records
// per product, FIRST EPSS, and the read-only Mongo collections (items,
// cve_intel, threat_actors). Every source reports its own status, so an
// outage reads as an outage in the response, never as "nothing found".

const UA = "skopnix stack check (+https://skopnix.com)";

async function getJson<T>(url: string, ms: number, headers: Record<string, string> = {}): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { accept: "application/json", "User-Agent": UA, ...headers } });
  if (!r.ok) throw new Error(`${new URL(url).hostname} answered ${r.status}`);
  return (await r.json()) as T;
}

// ---- CISA KEV (with vendor/product names, which lib/cveintel's kevMeta drops) ----

type KevCatalog = { entries: Map<string, KevEntry>; names: KevName[]; released: string | null };

const kevCatalog = ttlMemo(
  async (): Promise<KevCatalog> => {
    const d = await getJson<{
      dateReleased?: string;
      vulnerabilities?: { cveID: string; vendorProject?: string; product?: string; dateAdded?: string; knownRansomwareCampaignUse?: string }[];
    }>("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", 10_000);
    const entries = new Map<string, KevEntry>();
    const names = new Map<string, KevName>();
    for (const v of d.vulnerabilities ?? []) {
      const cve = v.cveID.toUpperCase();
      const e: KevEntry = {
        cve,
        vendor: v.vendorProject ?? "",
        product: v.product ?? "",
        dateAdded: v.dateAdded ?? null,
        ransomware: (v.knownRansomwareCampaignUse ?? "").toLowerCase() === "known",
      };
      entries.set(cve, e);
      names.set(`${e.vendor}|${e.product}`.toLowerCase(), { vendor: e.vendor, product: e.product });
    }
    if (!entries.size) throw new Error("empty KEV catalog");
    return { entries, names: [...names.values()], released: d.dateReleased?.slice(0, 10) ?? null };
  },
  6 * 3600_000,
  1,
);

// ---- NVD: every CVE filed under one vendor:product, ranges evaluated locally ----

const NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const NVD_PAGE = 2000;
const NVD_CAP = 4000; // a Chrome-scale product is cut here, and the response says so

type RawCve = { cve: { id: string; configurations?: { nodes?: { cpeMatch?: CpeMatch[] }[] }[] } };
type ProductPull = { cves: ProductCve[]; truncated: boolean };

async function pullOne(part: CpePart, vendor: string, product: string): Promise<{ total: number; cves: ProductCve[] }> {
  const key = process.env.NVD_API_KEY;
  const headers: Record<string, string> = key ? { apiKey: key } : {};
  const base = `${NVD}?virtualMatchString=${encodeURIComponent(cpeName(part, vendor, product))}&resultsPerPage=${NVD_PAGE}`;
  const out: ProductCve[] = [];
  let total = 0;
  for (let start = 0; start < NVD_CAP; start += NVD_PAGE) {
    const d = await getJson<{ totalResults?: number; vulnerabilities?: RawCve[] }>(`${base}&startIndex=${start}`, 20_000, headers);
    total = d.totalResults ?? 0;
    // Keep only the rows naming this product: the cache then holds kilobytes, not the NVD record.
    for (const v of d.vulnerabilities ?? []) out.push({ id: v.cve.id.toUpperCase(), matches: matchesFor(cpeMatchesOf(v.cve), vendor, product) });
    if (!d.vulnerabilities?.length || start + NVD_PAGE >= total) break;
  }
  return { total, cves: out };
}

// In-process and bounded (ttlMemo), not unstable_cache: the key is whatever
// product name a caller types, and the data cache would write each one to the
// host's disk (see lib/isr-cache-handler.mjs for why that matters here).
const nvdProduct = ttlMemo(
  async (vendor: string, product: string, part: CpePart | null): Promise<ProductPull> => {
    for (const p of part ? [part] : (["a", "o"] as const)) {
      const r = await pullOne(p, vendor, product);
      if (r.total > 0) return { cves: r.cves, truncated: r.total > NVD_CAP };
    }
    return { cves: [], truncated: false };
  },
  12 * 3600_000,
  400,
);

// ---- the whole check ----------------------------------------------------------

/** Distinct NVD product pulls one request may start (keyless NVD allows ~5 requests / 30 s). */
const NVD_KEYED = !!process.env.NVD_API_KEY;
const NVD_BUDGET = NVD_KEYED ? 40 : 8;
const NVD_WORKERS = NVD_KEYED ? 3 : 2;
const NVD_DEADLINE_MS = 40_000;
const MAX_FACT_CVES = 3000;

export type SourceStatus = "ok" | "unavailable";
export type StackReport = {
  generated_at: string;
  summary: { components: number; with_findings: number; kev_cves: number; cves_with_cited_actors: number };
  sources: {
    kev_catalog: { status: SourceStatus; released: string | null };
    nvd: { pulled: number; skipped: number; errors: number; truncated: string[] };
    epss: SourceStatus;
    actors: SourceStatus;
    coverage: SourceStatus;
  };
  components: ComponentResult[];
};

type Job = { id: string; vendor: string; product: string; part: CpePart | null };

function jobsFor(r: Resolved): Job[] {
  return [{ vendor: r.vendor, product: r.product, part: r.part ?? null }, ...(r.alts ?? []).map((a) => ({ vendor: a.vendor, product: a.product, part: a.part ?? null }))].map(
    (j) => ({ ...j, id: `${j.part ?? "*"}:${j.vendor}:${j.product}` }),
  );
}

export async function checkStack(components: Component[]): Promise<StackReport> {
  const started = Date.now();
  let kev: KevCatalog | null = null;
  try {
    kev = await kevCatalog();
  } catch {
    kev = null;
  }
  const kevEntries = kev ? [...kev.entries.values()] : [];

  const resolved = components.map((c) => resolveComponent(c, kev?.names ?? []));
  const named = components.map((c, i) => (resolved[i] ? kevByName(resolved[i]!, c, kevEntries) : []));

  // Spend the NVD budget where it matters: products with KEV hits first, then
  // the ones we identified exactly, then name guesses.
  const rank = (i: number) => (named[i].length ? 0 : 1) * 10 + ({ cpe: 0, purl: 1, alias: 2, kev: 3, name: 4 } as const)[resolved[i]!.via];
  const order = resolved.map((_, i) => i).filter((i) => resolved[i]).sort((a, b) => rank(a) - rank(b));
  const jobs = new Map<string, Job>();
  for (const i of order) for (const j of jobsFor(resolved[i]!)) if (!jobs.has(j.id) && jobs.size < NVD_BUDGET) jobs.set(j.id, j);

  const pulls = new Map<string, ProductPull | "error">();
  const queue = [...jobs.values()];
  const worker = async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      if (Date.now() - started > NVD_DEADLINE_MS) return;
      try {
        pulls.set(j.id, await nvdProduct(j.vendor, j.product, j.part));
      } catch {
        pulls.set(j.id, "error");
      }
    }
  };
  await Promise.all(Array.from({ length: NVD_WORKERS }, worker));

  const nvdFor = (r: Resolved): NvdPull => {
    const got = jobsFor(r).map((j) => pulls.get(j.id));
    if (got.every((g) => g === undefined)) return { status: "skipped" };
    if (got.some((g) => g === "error")) return { status: "error" };
    const byId = new Map<string, ProductCve>();
    for (const g of got) {
      if (!g || g === "error") continue;
      for (const c of g.cves) {
        const cur = byId.get(c.id);
        byId.set(c.id, cur ? { id: c.id, matches: [...cur.matches, ...c.matches] } : c);
      }
    }
    return { status: "ok", cves: [...byId.values()] };
  };
  const nvd = resolved.map((r) => (r ? nvdFor(r) : ({ status: "skipped" } as NvdPull)));

  // First pass without facts and without the per-component cap, to learn
  // every CVE we might report (facts change the ranking, hence the cap).
  const empty: CveFacts = { kev: kev?.entries ?? new Map(), epss: new Map(), priority: new Map(), actors: new Map() };
  const draft = components.map((c, i) => assessComponent(c, resolved[i], nvd[i], named[i], empty, Infinity));
  const cveIds = [...new Set(draft.flatMap((d) => d.findings.map((f) => f.cve)))].slice(0, MAX_FACT_CVES);

  const [mongo, epss] = await Promise.all([mongoFacts(cveIds), firstEpss(cveIds)]);
  const kevMap = kev?.entries ?? mongo.kevFallback;
  const facts: CveFacts = {
    kev: kevMap,
    epss: new Map([...mongo.epss, ...epss.map]),
    priority: mongo.priority,
    actors: mongo.actors,
  };
  const results = components.map((c, i) => assessComponent(c, resolved[i], nvd[i], named[i], facts));

  const all = results.flatMap((r) => r.findings);
  return {
    generated_at: new Date().toISOString(),
    summary: {
      components: components.length,
      with_findings: results.filter((r) => r.findings.length).length,
      kev_cves: new Set(all.filter((f) => f.kev).map((f) => f.cve)).size,
      cves_with_cited_actors: new Set(all.filter((f) => f.actors.length).map((f) => f.cve)).size,
    },
    sources: {
      kev_catalog: { status: kev ? "ok" : "unavailable", released: kev?.released ?? null },
      nvd: {
        pulled: [...pulls.values()].filter((p) => p !== "error").length,
        skipped: new Set(resolved.flatMap((r) => (r ? jobsFor(r).map((j) => j.id) : [])).filter((id) => !pulls.has(id))).size,
        errors: [...pulls.values()].filter((p) => p === "error").length,
        truncated: [...pulls.entries()].filter(([, p]) => p !== "error" && p.truncated).map(([id]) => id),
      },
      epss: epss.ok || mongo.ok ? "ok" : "unavailable",
      actors: mongo.ok ? "ok" : "unavailable",
      coverage: mongo.ok ? "ok" : "unavailable",
    },
    components: results,
  };
}

async function firstEpss(cves: string[]): Promise<{ ok: boolean; map: Map<string, number> }> {
  const map = new Map<string, number>();
  if (!cves.length) return { ok: true, map };
  let ok = false;
  // FIRST takes 100 ids per call; three calls cover the reported set in practice.
  for (let i = 0; i < Math.min(cves.length, 300); i += 100) {
    const part = await epssMap(cves.slice(i, i + 100));
    if (part.size) ok = true;
    for (const [k, v] of part) map.set(k, v);
  }
  return { ok, map };
}

type MongoFacts = {
  ok: boolean;
  epss: Map<string, number>;
  priority: Map<string, string>;
  actors: Map<string, ActorClaim[]>;
  kevFallback: Map<string, KevEntry>;
};

async function mongoFacts(cves: string[]): Promise<MongoFacts> {
  const empty: MongoFacts = { ok: false, epss: new Map(), priority: new Map(), actors: new Map(), kevFallback: new Map() };
  if (!cves.length) return { ...empty, ok: true };
  try {
    const db = await getDb();
    const wanted = new Set(cves);
    const [items, intel, actors] = await Promise.all([
      db
        .collection<{ _id: string; cve_ids?: string[]; kev?: boolean; epss?: number }>("items")
        .find({ cve_ids: { $in: cves } }, { projection: { cve_ids: 1, kev: 1, epss: 1 } })
        .limit(5000)
        .toArray(),
      db
        .collection<{ _id: string; priority?: string }>("cve_intel")
        .find({ _id: { $in: cves } }, { projection: { priority: 1 } })
        .toArray(),
      db
        .collection<{ _id: string; name?: string; cves?: ActorCveRow[] }>("threat_actors")
        .find({ "cves.cve": { $in: cves } }, { projection: { name: 1, cves: 1 } })
        .limit(500)
        .toArray(),
    ]);
    const epss = new Map<string, number>();
    const kevFallback = new Map<string, KevEntry>();
    for (const it of items) {
      // An item's kev/epss belong to the item; they only speak for a CVE when
      // the item is about that one CVE.
      if (it.cve_ids?.length !== 1) continue;
      const id = it.cve_ids[0].toUpperCase();
      if (typeof it.epss === "number" && it.epss > 0) epss.set(id, Math.max(epss.get(id) ?? 0, it.epss));
      if (it.kev) kevFallback.set(id, { cve: id, vendor: "", product: "", dateAdded: null, ransomware: false });
    }
    const priority = new Map<string, string>();
    for (const d of intel) if (typeof d.priority === "string") priority.set(String(d._id).toUpperCase(), d.priority);
    const claims = mergeClaims(actors.map((a) => actorClaims(String(a._id), a.name || String(a._id), a.cves, wanted)));
    return { ok: true, epss, priority, actors: claims, kevFallback };
  } catch {
    return empty;
  }
}
