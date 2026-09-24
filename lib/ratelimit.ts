// Lightweight best-effort rate limiter. In-memory fixed-window per (key, caller)
// — callers are keyed by clientBucket() below — per serverless instance, so
// it's a bursty-abuse dampener, not a hard global cap (that would need a
// shared store like Vercel KV). Its job here is to blunt cost-abuse of the
// keyed Blockchair endpoint and the Shodan lookup, and to cap revalidation
// spam, at zero infra cost.
type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now > b.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    // opportunistic cleanup so the map can't grow unbounded on a warm instance
    if (store.size > 5000) {
      for (const [k, v] of store) if (now > v.reset) store.delete(k);
    }
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

// Per-instance daily budget backstop for the PAID upstreams (Blockchair, HIBP).
// The per-IP rateLimit above blunts single-IP bursts; this bounds the total spend
// one warm instance can drive in a window regardless of IP — so a rotating-IP
// abuser can't run the monthly budget to zero from a single instance. It is NOT a
// hard global cap across instances (that needs a shared store like Vercel KV);
// it's a best-effort ceiling at zero infra cost. Generous enough to never touch
// legitimate traffic. Returns false once the instance has spent `max` this window.
const budgets = new Map<string, Bucket>();
export function withinDailyBudget(key: string, max: number, windowMs = 86_400_000): boolean {
  const now = Date.now();
  const b = budgets.get(key);
  if (!b || now > b.reset) {
    budgets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

// TRUE cross-instance daily cap, backed by a shared store when one is configured.
// Uses Upstash Redis's REST API (no npm dependency — just fetch) IF both
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set; otherwise it
// transparently falls back to the per-instance withinDailyBudget() above. Any
// store error (timeout, 5xx, malformed reply) also falls back — the paid route
// must never be blocked by the limiter's own infra. Free-tier Upstash is enough
// (a handful of commands per paid request, well under 10k/day).
export async function withinSharedDailyBudget(
  key: string,
  max: number,
  windowMs = 86_400_000,
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return withinDailyBudget(key, max, windowMs);
  try {
    const k = `budget:${key}`;
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      // INCR the counter, and set the daily TTL only if it has none yet (NX).
      body: JSON.stringify([["INCR", k], ["EXPIRE", k, Math.ceil(windowMs / 1000), "NX"]]),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return withinDailyBudget(key, max, windowMs);
    const data = (await res.json()) as Array<{ result?: unknown }>;
    const n = Array.isArray(data) ? Number(data[0]?.result) : NaN;
    if (!Number.isFinite(n)) return withinDailyBudget(key, max, windowMs);
    return n <= max;
  } catch {
    return withinDailyBudget(key, max, windowMs); // never block a paid route on the store
  }
}

// ---------------------------------------------------------------------------
// Who is calling, and from where. Every rate limit above (through
// clientBucket), the proof-of-work caller binding (lib/pow.ts) and the
// ip/country/city stored with visits and signups key on these two helpers, so
// they must read ONLY headers that the proxy in front of the app sets and
// overwrites. Which headers those are depends on the host, so it is
// configured, not guessed (2026-09-24, for the move off Vercel to a
// Cloudflare Tunnel):
//
//   TRUSTED_PROXY=vercel      (default) Vercel's edge: x-real-ip, else the
//                             rightmost X-Forwarded-For hop; x-vercel-ip-* geo.
//   TRUSTED_PROXY=cloudflare  Cloudflare: CF-Connecting-IP and CF-IPCountry
//                             ONLY. Everything else is client-supplied there.
//   TRUSTED_PROXY=xff:<n>     n trusted proxies that each append one hop: the
//                             client is the n-th X-Forwarded-For hop from the
//                             right. No trusted geo.
//   TRUSTED_PROXY=none        trust nothing: every caller is "unknown".
//
// The default keeps today's behaviour, so merging this is a no-op on Vercel.
// Off Vercel the default is spoofable (x-real-ip is just a request header
// there), so every self-hosted deployment must pin the mode explicitly.
// ---------------------------------------------------------------------------
export type TrustedProxy =
  | { kind: "vercel" }
  | { kind: "cloudflare" }
  | { kind: "xff"; hops: number }
  | { kind: "none" };

export type ClientGeo = { country: string | null; city: string | null };

// Unset or blank means the default; anything unrecognised returns null so the
// caller can fail safe instead of silently trusting a header it should not.
export function parseTrustedProxy(raw: string | undefined): TrustedProxy | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "" || value === "vercel") return { kind: "vercel" };
  if (value === "cloudflare") return { kind: "cloudflare" };
  if (value === "none") return { kind: "none" };
  const xff = /^xff:([1-9]\d?)$/.exec(value);
  return xff ? { kind: "xff", hops: Number(xff[1]) } : null;
}

// A typo must not quietly fall back to trusting client headers: an unknown
// value collapses every caller into one "unknown" bucket (strict limits for
// all, never an open door) and says so once, when the module loads.
function trustedProxyFromEnv(): TrustedProxy {
  const mode = parseTrustedProxy(process.env.TRUSTED_PROXY);
  if (mode) return mode;
  console.error(
    "TRUSTED_PROXY is not one of vercel | cloudflare | xff:<n> | none — " +
      "trusting no proxy headers, so every caller shares one rate-limit bucket.",
  );
  return { kind: "none" };
}

const TRUSTED_PROXY = trustedProxyFromEnv();

function header(req: Request, name: string): string | null {
  const value = req.headers.get(name)?.trim();
  return value ? value : null;
}

// The n-th hop from the RIGHT, never the leftmost: the leftmost is whatever the
// client typed, so a rotating value would mint a fresh rate-limit bucket per
// request and silently defeat every cap. Fewer hops than trusted proxies means
// the request did not come through them, so it is "unknown", not a guess.
function forwardedHop(req: Request, fromRight: number): string | null {
  const hops = (req.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return hops[hops.length - fromRight] ?? null;
}

// Cloudflare sends "XX" when it has no country for the address (stored as
// null, like a missing header) and "T1" for Tor exits, which is kept: for a
// threat-intel site, Tor traffic is worth seeing on the dashboard. Anything
// else that is not a two-letter code is dropped rather than stored raw.
function cloudflareCountry(raw: string | null): string | null {
  const code = (raw ?? "").toUpperCase();
  if (code === "T1") return code;
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

export function clientIp(req: Request, mode: TrustedProxy = TRUSTED_PROXY): string {
  switch (mode.kind) {
    case "vercel":
      // Vercel's edge overwrites x-real-ip with the true connecting IP on every
      // request; the rightmost X-Forwarded-For hop is its own append.
      return header(req, "x-real-ip") ?? forwardedHop(req, 1) ?? "unknown";
    case "cloudflare":
      return header(req, "cf-connecting-ip") ?? "unknown";
    case "xff":
      return forwardedHop(req, mode.hops) ?? "unknown";
    case "none":
      return "unknown";
  }
}

export function clientGeo(req: Request, mode: TrustedProxy = TRUSTED_PROXY): ClientGeo {
  switch (mode.kind) {
    case "vercel":
      return {
        country: req.headers.get("x-vercel-ip-country") || null,
        city: req.headers.get("x-vercel-ip-city") || null,
      };
    case "cloudflare":
      // City needs a Cloudflare managed transform that is not enabled, so a
      // cf-ipcity header cannot be told apart from one the client typed.
      return { country: cloudflareCountry(header(req, "cf-ipcountry")), city: null };
    case "xff":
    case "none":
      return { country: null, city: null };
  }
}

// ---------------------------------------------------------------------------
// The rate-limit identity of a caller (2026-09-24). An IPv4 address is one
// subscriber, but an IPv6 subscriber is handed at least a /64 (2^64
// addresses) and can source every request from a new one: keyed on the full
// address, each request minted a fresh bucket and walked past every per-IP
// cap. Behind Cloudflare, which gives proxied hostnames AAAA records by
// default, every IPv6 visitor arrives that way. So the limiter keys IPv6 on
// its /64. Only the limiter key is coarsened: stored ips and the PoW binding
// keep clientIp().
// ---------------------------------------------------------------------------
const HEXTET = /^[0-9a-f]{1,4}$/;
const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/;

// The eight 16-bit groups of a plain-hex IPv6 address, "::" expanded, or null
// for anything else (IPv4, "unknown", a zone id, a dotted tail).
function ipv6Hextets(ip: string): number[] | null {
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const groups = (half: string) => (half ? half.split(":") : []);
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const all = [...head, ...Array<string>(missing).fill("0"), ...tail];
  return all.every((g) => HEXTET.test(g)) ? all.map((g) => parseInt(g, 16)) : null;
}

// IPv4 as is; an IPv4-mapped IPv6 address as its IPv4 (its /64 would hold
// every IPv4 client); any other IPv6 address as its /64, e.g. "2001:db8:1:2::/64".
export function ipBucket(ip: string): string {
  const value = ip.toLowerCase();
  const mapped = IPV4_MAPPED.exec(value);
  if (mapped) return mapped[1];
  const hextets = ipv6Hextets(value);
  if (!hextets) return ip;
  return `${hextets.slice(0, 4).map((h) => h.toString(16)).join(":")}::/64`;
}

// What every per-IP rateLimit() key is built from.
export function clientBucket(req: Request, mode: TrustedProxy = TRUSTED_PROXY): string {
  return ipBucket(clientIp(req, mode));
}
