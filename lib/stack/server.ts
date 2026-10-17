import { getDb } from "../db";
import { ttlMemo } from "../memo";
import type { ActorClaim, ActorCveRow, Component, ComponentResult, CpePart, Resolved } from "./types";
import { resolveComponent, type KevName } from "./resolve";
import { RateLimiter, SkipError, epssBatched, nvdRate, pullProduct, type FetchJson, type ProductPull } from "./upstream";
import { actorClaims, assessComponent, combinePulls, kevByName, mergeClaims, planFacts, type CveFacts, type KevEntry, type NvdPull } from "./match";

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

const NVD_KEY = process.env.NVD_API_KEY || undefined;
const NVD_KEYED = !!NVD_KEY;
const NVD_RATE = nvdRate(NVD_KEY);
// One limiter for the whole process: concurrent checks share NVD's per-IP limit.
const nvdLimiter = new RateLimiter(NVD_RATE.limit, NVD_RATE.windowMs);
const nvdFetch: FetchJson = (url, ms) => getJson(url, ms, NVD_KEY ? { apiKey: NVD_KEY } : {});
const fetchJson: FetchJson = (url, ms) => getJson(url, ms);

// In-process and bounded (ttlMemo), not unstable_cache: the key is whatever
// product name a caller types, and the data cache would write each one to the
// host's disk (see lib/isr-cache-handler.mjs for why that matters here). The
// deadline is per request and not part of the key.
const nvdProduct = ttlMemo(
  (vendor: string, product: string, part: CpePart | null, deadline: number): Promise<ProductPull> =>
    pullProduct(vendor, product, part, { deadline, limiter: nvdLimiter, fetchJson: nvdFetch }),
  12 * 3600_000,
  400,
  (vendor, product, part) => JSON.stringify([vendor, product, part]),
);

// ---- the whole check ----------------------------------------------------------

/** Distinct NVD product pulls one request may start; the rate limiter paces them. */
const NVD_BUDGET = NVD_KEYED ? 40 : 8;
const NVD_WORKERS = NVD_KEYED ? 3 : 2;
/** No NVD request runs past this (each request's timeout is clipped to it). */
const NVD_DEADLINE_MS = 40_000;
/** Facts (Mongo, EPSS) must be in by this, inside the route's 60 s maxDuration. */
const FACTS_DEADLINE_MS = 52_000;
const MAX_FACT_CVES = 3000;

export type SourceStatus = "ok" | "unavailable";
export type StackReport = {
  generated_at: string;
  summary: { components: number; with_findings: number; kev_cves: number; cves_with_cited_actors: number };
  sources: {
    kev_catalog: { status: SourceStatus; released: string | null };
    nvd: {
      pulled: number;
      skipped: number;
      errors: number;
      truncated: string[];
      /** Whether an NVD API key is set; without one NVD allows 5 requests per 30 s. */
      keyed: boolean;
      rate: { requests: number; per_seconds: number };
      /** Why CPE names were skipped: over the per-check budget, no rate-limit slot in time, or out of time. */
      skipped_by: { budget: number; rate_limit: number; deadline: number };
    };
    epss: SourceStatus;
    actors: SourceStatus;
    coverage: SourceStatus;
    /** Over the per-check caps, facts go to the most urgent CVEs (KEV first); the rest carry not_looked_up. */
    facts: { cves: number; looked_up: number; epss_looked_up: number; truncated: boolean };
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

  const pulls = new Map<string, ProductPull | "error" | "skipped">();
  const skippedBy = { budget: 0, rate_limit: 0, deadline: 0 };
  const nvdDeadline = started + NVD_DEADLINE_MS;
  const queue = [...jobs.values()];
  const worker = async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      try {
        pulls.set(j.id, await nvdProduct(j.vendor, j.product, j.part, nvdDeadline));
      } catch (e) {
        if (e instanceof SkipError) {
          pulls.set(j.id, "skipped");
          skippedBy[e.reason === "rate-limit" ? "rate_limit" : "deadline"]++;
        } else pulls.set(j.id, "error");
      }
    }
  };
  await Promise.all(Array.from({ length: NVD_WORKERS }, worker));

  // Per CPE name: a cut or failed alt name makes the check partial, never
  // silently complete, and never throws away what the other names returned.
  const nvdFor = (r: Resolved): NvdPull =>
    combinePulls(
      jobsFor(r).map((j) => {
        const got = pulls.get(j.id);
        return { name: `${j.vendor}:${j.product}`, result: got === undefined ? "skipped" : got };
      }),
    );
  const nvd = resolved.map((r) => (r ? nvdFor(r) : ({ status: "skipped" } as NvdPull)));

  // First pass without facts and without the per-component cap, to learn
  // every CVE we might report (facts change the ranking, hence the cap).
  const empty: CveFacts = { kev: kev?.entries ?? new Map(), epss: new Map(), priority: new Map(), actors: new Map() };
  const draft = components.map((c, i) => assessComponent(c, resolved[i], nvd[i], named[i], empty, Infinity));
  // Over the caps, the most urgent CVEs (KEV first) get their facts; the rest
  // are flagged per finding and counted in sources.facts, never silently cut.
  const plan = planFacts(draft, MAX_FACT_CVES, MAX_EPSS_CVES);
  const cveIds = plan.facts;

  const factsDeadline = started + FACTS_DEADLINE_MS;
  const [mongo, epss] = await Promise.all([
    beforeDeadline(mongoFacts(cveIds), factsDeadline, MONGO_UNAVAILABLE),
    epssBatched(plan.epss, { deadline: factsDeadline, fetchJson }),
  ]);
  const kevMap = kev?.entries ?? mongo.kevFallback;
  const facts: CveFacts = {
    kev: kevMap,
    epss: new Map([...mongo.epss, ...epss.map]),
    priority: mongo.priority,
    actors: mongo.actors,
    lookedUp: plan.truncated ? { facts: new Set(plan.facts), epss: new Set(plan.epss) } : undefined,
  };
  const results = components.map((c, i) => assessComponent(c, resolved[i], nvd[i], named[i], facts));

  const all = results.flatMap((r) => r.findings);
  const allJobIds = [...new Set(resolved.flatMap((r) => (r ? jobsFor(r).map((j) => j.id) : [])))];
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
        pulled: [...pulls.values()].filter((p) => p !== "error" && p !== "skipped").length,
        skipped: allJobIds.filter((id) => !pulls.has(id) || pulls.get(id) === "skipped").length,
        errors: [...pulls.values()].filter((p) => p === "error").length,
        truncated: [...pulls.entries()].filter(([, p]) => p !== "error" && p !== "skipped" && p.truncated).map(([id]) => id),
        keyed: NVD_KEYED,
        rate: { requests: NVD_RATE.limit, per_seconds: 30 },
        skipped_by: { ...skippedBy, budget: allJobIds.filter((id) => !jobs.has(id)).length },
      },
      epss: epss.ok || mongo.ok ? "ok" : "unavailable",
      actors: mongo.ok ? "ok" : "unavailable",
      coverage: mongo.ok ? "ok" : "unavailable",
      facts: { cves: plan.total, looked_up: plan.facts.length, epss_looked_up: plan.epss.length, truncated: plan.truncated },
    },
    components: results,
  };
}

const MAX_EPSS_CVES = 300;

/** `p`, or `fallback` once the deadline passes (the work itself is not cancelled, only no longer awaited). */
function beforeDeadline<T>(p: Promise<T>, deadline: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<T>((r) => (timer = setTimeout(() => r(fallback), Math.max(0, deadline - Date.now()))));
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
}

type MongoFacts = {
  ok: boolean;
  epss: Map<string, number>;
  priority: Map<string, string>;
  actors: Map<string, ActorClaim[]>;
  kevFallback: Map<string, KevEntry>;
};

const MONGO_UNAVAILABLE: MongoFacts = { ok: false, epss: new Map(), priority: new Map(), actors: new Map(), kevFallback: new Map() };

async function mongoFacts(cves: string[]): Promise<MongoFacts> {
  const empty = MONGO_UNAVAILABLE;
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
