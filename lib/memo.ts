// ---------------------------------------------------------------------------
// A small in-process TTL memo for reads that route handlers repeat on every
// request (2026-10-10, the move off Vercel to one EC2 box).
//
// On Vercel the CDN honoured each handler's `s-maxage`, so /api/v1/items,
// /rss.xml and /feed.json ran a few times an hour no matter how often they
// were polled. Self-hosted behind Caddy nothing caches them: every poll was a
// fresh Mongo read (500 full stories for /api/v1/items) on a 1 GB box. One
// long-lived Node process now holds the result for a short window instead.
//
// - The promise is stored, so concurrent callers share one in-flight read.
// - A rejected read is dropped at once, so an outage is retried, not cached.
// - Bounded by entry count (oldest-used evicted first), so a caller varying
//   the arguments cannot grow it without limit.
// ---------------------------------------------------------------------------
type Entry<T> = { at: number; value: Promise<T> };

export function ttlMemo<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  ttlMs: number,
  maxEntries: number,
  keyOf: (...args: A) => string = (...args) => JSON.stringify(args),
): (...args: A) => Promise<T> {
  const store = new Map<string, Entry<T>>();
  return (...args: A): Promise<T> => {
    const key = keyOf(...args);
    const now = Date.now();
    const hit = store.get(key);
    if (hit && now - hit.at < ttlMs) {
      // Re-insert so Map order tracks recency of use.
      store.delete(key);
      store.set(key, hit);
      return hit.value;
    }
    const value = fn(...args);
    store.set(key, { at: now, value });
    value.catch(() => {
      if (store.get(key)?.value === value) store.delete(key);
    });
    while (store.size > maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
    return value;
  };
}
