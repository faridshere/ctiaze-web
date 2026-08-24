// Lightweight best-effort rate limiter. In-memory fixed-window per (key, IP) —
// per serverless instance, so it's a bursty-abuse dampener, not a hard global
// cap (that would need a shared store like Vercel KV). Its job here is to blunt
// cost-abuse of the keyed Blockchair endpoint and the Shodan lookup, and to cap
// revalidation spam, at zero infra cost.
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

export function clientIp(req: Request): string {
  // x-real-ip is set by Vercel's edge to the TRUE connecting IP and is overwritten
  // on every request, so the client cannot spoof it — prefer it. Only fall back to
  // X-Forwarded-For's RIGHTMOST hop (the one the trusted proxy appended), never the
  // leftmost: the leftmost is attacker-controlled, so a rotating header would mint a
  // fresh rate-limit bucket per request and silently defeat every cap.
  const real = req.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();
  const hops = (req.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return hops[hops.length - 1] || "unknown";
}
