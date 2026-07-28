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

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
