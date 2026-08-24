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
