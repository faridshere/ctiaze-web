import type { CpeMatch, CpePart, ProductCve } from "./types";
import { cpeName } from "./ids";
import { cpeMatchesOf, matchesFor } from "./match";

// The upstream calls of the stack check (NVD, FIRST EPSS), with what keeps
// them inside one request's time: a process-wide NVD rate limiter and a
// timeout on every request clipped to the time left. No database and no
// global fetch: the caller passes fetchJson, so the tests drive it with fakes.

export type FetchJson = <T>(url: string, timeoutMs: number) => Promise<T>;

/** A pull we did not make (not an NVD failure): no rate-limit slot, or no time left. */
export class SkipError extends Error {
  readonly reason: "rate-limit" | "deadline";
  constructor(reason: "rate-limit" | "deadline") {
    super(reason === "rate-limit" ? "no NVD request slot before the deadline" : "out of time for NVD");
    this.name = "SkipError";
    this.reason = reason;
  }
}

export type Clock = { now: () => number; sleep: (ms: number) => Promise<void> };
const realClock: Clock = { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };

/**
 * NVD's published limits: 5 requests in a rolling 30 s window without an API
 * key, 50 with one. The keyless window gets a second of slack, since NVD
 * counts arrivals and we count departures.
 */
export function nvdRate(apiKey: string | undefined): { limit: number; windowMs: number } {
  return apiKey ? { limit: 50, windowMs: 30_000 } : { limit: 5, windowMs: 31_000 };
}

/**
 * Sliding-window limiter. A slot is reserved synchronously, so concurrent
 * workers (and concurrent requests sharing one process) never over-book it;
 * the caller then waits until the slot's start.
 */
export class RateLimiter {
  private stamps: number[] = [];
  readonly limit: number;
  readonly windowMs: number;
  private clock: Clock;
  constructor(limit: number, windowMs: number, clock: Clock = realClock) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.clock = clock;
  }

  /** Wait for the next slot. False, without waiting or reserving, when that slot would start after `by`. */
  async acquire(by = Infinity): Promise<boolean> {
    const now = this.clock.now();
    while (this.stamps.length && this.stamps[0] <= now - this.windowMs) this.stamps.shift();
    const last = this.stamps[this.stamps.length - 1] ?? now;
    const at = this.stamps.length < this.limit ? Math.max(now, last) : this.stamps[this.stamps.length - this.limit] + this.windowMs;
    if (at > by) return false;
    this.stamps.push(at);
    if (at > now) await this.clock.sleep(at - now);
    return true;
  }
}

// ---- NVD -------------------------------------------------------------------

const NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const NVD_PAGE = 2000;
export const NVD_CAP = 4000; // a Chrome-scale product is cut here, and the response says so
const NVD_PAGE_TIMEOUT_MS = 20_000;
/** Not worth starting a request with less time than this left. */
const MIN_REQUEST_MS = 1500;

type RawCve = { cve: { id: string; configurations?: { nodes?: { cpeMatch?: CpeMatch[] }[] }[] } };
export type ProductPull = { cves: ProductCve[]; truncated: boolean };

export type PullOpts = {
  /** Epoch ms after which no request may still be running. */
  deadline: number;
  limiter: RateLimiter;
  fetchJson: FetchJson;
  now?: () => number;
};

const isTimeout = (e: unknown) => e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");

/** One request, inside the rate limit and the time left. */
async function nvdGet<T>(url: string, o: PullOpts): Promise<T> {
  const now = o.now ?? Date.now;
  if (!(await o.limiter.acquire(o.deadline - MIN_REQUEST_MS))) throw new SkipError("rate-limit");
  const left = o.deadline - now();
  if (left < MIN_REQUEST_MS) throw new SkipError("deadline");
  const ms = Math.min(NVD_PAGE_TIMEOUT_MS, left);
  try {
    return await o.fetchJson<T>(url, ms);
  } catch (e) {
    // Our own deadline cut it short: that is a skip, not an NVD outage.
    if (ms < NVD_PAGE_TIMEOUT_MS && isTimeout(e)) throw new SkipError("deadline");
    throw e;
  }
}

async function pullOne(part: CpePart, vendor: string, product: string, o: PullOpts): Promise<{ total: number; cves: ProductCve[] }> {
  const base = `${NVD}?virtualMatchString=${encodeURIComponent(cpeName(part, vendor, product))}&resultsPerPage=${NVD_PAGE}`;
  const out: ProductCve[] = [];
  let total = 0;
  for (let start = 0; start < NVD_CAP; start += NVD_PAGE) {
    const d = await nvdGet<{ totalResults?: number; vulnerabilities?: RawCve[] }>(`${base}&startIndex=${start}`, o);
    total = d.totalResults ?? 0;
    // Keep only the rows naming this product: the cache then holds kilobytes, not the NVD record.
    for (const v of d.vulnerabilities ?? []) out.push({ id: v.cve.id.toUpperCase(), matches: matchesFor(cpeMatchesOf(v.cve), vendor, product) });
    if (!d.vulnerabilities?.length || start + NVD_PAGE >= total) break;
  }
  return { total, cves: out };
}

/**
 * Every CVE NVD files under one vendor:product. With no known part, tries "a"
 * then "o". Throws SkipError when the rate limit or the deadline stops it.
 */
export async function pullProduct(vendor: string, product: string, part: CpePart | null, o: PullOpts): Promise<ProductPull> {
  for (const p of part ? [part] : (["a", "o"] as const)) {
    const r = await pullOne(p, vendor, product, o);
    if (r.total > 0) return { cves: r.cves, truncated: r.total > NVD_CAP };
  }
  return { cves: [], truncated: false };
}

// ---- FIRST EPSS ------------------------------------------------------------

const EPSS = "https://api.first.org/data/v1/epss";
const EPSS_BATCH = 100; // ids per call FIRST accepts in one query string
const EPSS_TIMEOUT_MS = 8000;

/** EPSS for `cves`, in parallel batches of 100, none running past `deadline`. */
export async function epssBatched(
  cves: string[],
  o: { deadline: number; fetchJson: FetchJson; now?: () => number },
): Promise<{ ok: boolean; map: Map<string, number> }> {
  const map = new Map<string, number>();
  if (!cves.length) return { ok: true, map };
  const now = o.now ?? Date.now;
  const batches: string[][] = [];
  for (let i = 0; i < cves.length; i += EPSS_BATCH) batches.push(cves.slice(i, i + EPSS_BATCH));
  const left = o.deadline - now();
  if (left < MIN_REQUEST_MS) return { ok: false, map };
  const ms = Math.min(EPSS_TIMEOUT_MS, left);
  const got = await Promise.all(
    batches.map((b) =>
      o.fetchJson<{ data?: { cve: string; epss: string }[] }>(`${EPSS}?cve=${b.map(encodeURIComponent).join(",")}`, ms).catch(() => null),
    ),
  );
  let ok = false;
  for (const d of got) {
    if (!d) continue;
    ok = true;
    for (const row of d.data ?? []) {
      const v = parseFloat(row.epss);
      if (Number.isFinite(v)) map.set(row.cve.toUpperCase(), v);
    }
  }
  return { ok, map };
}
