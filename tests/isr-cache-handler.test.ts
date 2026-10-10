import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createRequire, register } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

// lib/isr-cache-handler.mjs is Next's own file-system ISR cache with one
// change: a 404 or redirect page and an unstable_cache null are kept in
// memory, never written to disk, unless they replace an entry already there
// (2026-09-24, self-hosting). These tests drive the real handler against a
// temp dist dir, the way Next's IncrementalCache constructs it.

const { default: Handler } = await import("../lib/isr-cache-handler.mjs");
const { nodeFs } = createRequire(import.meta.url)("next/dist/server/lib/node-fs-methods");

function sandbox() {
  const dist = mkdtempSync(join(tmpdir(), "isr-cache-"));
  const cache = new Handler({
    fs: nodeFs,
    serverDistDir: join(dist, "server"),
    flushToDisk: true,
    maxMemoryCacheSize: 1024 * 1024,
    revalidatedTags: [],
  });
  const filesUnder = (dir: string) => (existsSync(join(dist, dir)) ? readdirSync(join(dist, dir), { recursive: true }) : []);
  return { cache, filesUnder, cleanup: () => rmSync(dist, { recursive: true, force: true }) };
}

function page(status: number, html = "<html></html>") {
  return { kind: "APP_PAGE", html, rscData: Buffer.from("rsc"), headers: {}, status, postponed: undefined, segmentData: undefined };
}

// An unstable_cache entry as Next writes it: the loader's result, JSON-encoded.
function cached(result: unknown) {
  return { kind: "FETCH", data: { headers: {}, body: JSON.stringify(result), status: 200 }, revalidate: 3600 };
}
const DATA_CTX = { fetchCache: true, tags: [] };

// The LRU letting an entry go, as it does under crawler traffic.
const evict = (key: string) => (Handler as unknown as { memoryCache: { remove(key: string): void } }).memoryCache.remove(key);
const junk = () => Math.random().toString().slice(2, 9);

test("a 404 page is served from memory and never written to disk", async () => {
  const s = sandbox();
  try {
    const key = `/cve/CVE-2099-${Math.random().toString().slice(2, 9)}`;
    await s.cache.set(key, page(404), {});
    assert.deepEqual(s.filesUnder("server"), [], "nothing may reach the disk");
    const hit = await s.cache.get(key, { kind: "APP_PAGE" });
    assert.equal(hit?.value?.status, 404, "the not-found render is still cached, in memory");
  } finally {
    s.cleanup();
  }
});

test("a redirect page and a null unstable_cache result stay in memory too", async () => {
  const s = sandbox();
  try {
    // /news/<id><any tail> redirects to the canonical slug: one entry per tail.
    const key = `/news/cve-2024-340-junk${junk()}`;
    await s.cache.set(key, page(308), {});
    // getActorByIdCached("<junk>") resolves to null.
    const dataKey = `fetch-${junk()}`;
    await s.cache.set(dataKey, cached(null), DATA_CTX);
    assert.deepEqual(s.filesUnder("server"), [], "no page file");
    assert.deepEqual(s.filesUnder("cache"), [], "no fetch-cache file");
    assert.equal((await s.cache.get(dataKey, { kind: "FETCH", tags: [] }))?.value?.data?.body, "null", "the miss is still cached, in memory");
  } finally {
    s.cleanup();
  }
});

// A story taken down after it rendered: a 404 kept only in memory would let
// the old page come back from disk the moment the LRU evicted the 404.
test("a 404 replaces a page already on disk, so eviction cannot bring the old page back", async () => {
  const s = sandbox();
  try {
    const key = `/news/taken-down-${junk()}`;
    await s.cache.set(key, page(200, "<p>old story</p>"), {});
    await s.cache.set(key, page(404, "<p>not found</p>"), {});
    evict(key);
    assert.equal((await s.cache.get(key, { kind: "APP_PAGE" }))?.value?.status, 404);

    const dataKey = `fetch-${junk()}`;
    await s.cache.set(dataKey, cached({ id: "removed-actor" }), DATA_CTX);
    await s.cache.set(dataKey, cached(null), DATA_CTX);
    evict(dataKey);
    assert.equal((await s.cache.get(dataKey, { kind: "FETCH", tags: [] }))?.value?.data?.body, "null");
  } finally {
    s.cleanup();
  }
});

test("a real page and a data-cache entry are still written to disk", async () => {
  const s = sandbox();
  try {
    const key = `/cve/CVE-2021-${Math.random().toString().slice(2, 9)}`;
    await s.cache.set(key, page(200), {});
    const written = s.filesUnder("server/app").map(String);
    assert.ok(written.some((f) => f.endsWith(".html")) && written.some((f) => f.endsWith(".meta")), written.join(", "));

    // unstable_cache data lands in .next/cache/fetch-cache, the persistent volume.
    await s.cache.set(`fetch-${junk()}`, cached({}), DATA_CTX);
    assert.equal(s.filesUnder("cache/fetch-cache").length, 1);
  } finally {
    s.cleanup();
  }
});

// The handler must be wired for the self-hosted build and left out on Vercel,
// where a custom handler would replace Vercel's own data cache.
register("./ts-ext-loader.mjs", import.meta.url);
async function configWith(vercel: string | undefined, tag: string) {
  const saved = process.env.VERCEL;
  if (vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = vercel;
  try {
    return (await import(`../next.config.ts?${tag}`)).default;
  } finally {
    if (saved === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = saved;
  }
}

test("next.config uses the handler off Vercel and Next's default on Vercel", async () => {
  const selfHosted = await configWith(undefined, "self-hosted");
  assert.equal(selfHosted.cacheHandler, join(process.cwd(), "lib", "isr-cache-handler.mjs"));
  assert.ok(existsSync(selfHosted.cacheHandler), "the configured handler file exists");
  assert.equal((await configWith("1", "vercel")).cacheHandler, undefined);
});

test("a 404 page and a null result expire after emptyTtlMs, so a story published late renders", async () => {
  const s = sandbox();
  const H = Handler as unknown as { emptyTtlMs: number };
  const before = H.emptyTtlMs;
  H.emptyTtlMs = 20;
  try {
    const key = `/news/${junk()}-published-a-moment-later`;
    await s.cache.set(key, page(404), {});
    const dataKey = `fetch-${junk()}`;
    await s.cache.set(dataKey, cached(null), DATA_CTX);
    assert.equal((await s.cache.get(key, { kind: "APP_PAGE" }))?.value?.status, 404, "fresh 404 still served from cache");
    assert.equal((await s.cache.get(dataKey, { kind: "FETCH", tags: [] }))?.value?.data?.body, "null", "fresh null still served");
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(await s.cache.get(key, { kind: "APP_PAGE" }), null, "an old 404 is a miss, so the page renders again");
    assert.equal(await s.cache.get(dataKey, { kind: "FETCH", tags: [] }), null, "an old null is a miss too");
  } finally {
    H.emptyTtlMs = before;
    s.cleanup();
  }
});

test("a redirect and a real page do not expire early", async () => {
  const s = sandbox();
  const H = Handler as unknown as { emptyTtlMs: number };
  const before = H.emptyTtlMs;
  H.emptyTtlMs = 1;
  try {
    const redirectKey = `/news/cve-2024-340-junk${junk()}`;
    await s.cache.set(redirectKey, page(308), {});
    const pageKey = `/news/${junk()}-real`;
    await s.cache.set(pageKey, page(200), { cacheControl: { revalidate: 86400, expire: 31536000 } });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal((await s.cache.get(redirectKey, { kind: "APP_PAGE" }))?.value?.status, 308);
    assert.equal((await s.cache.get(pageKey, { kind: "APP_PAGE" }))?.value?.status, 200);
  } finally {
    H.emptyTtlMs = before;
    s.cleanup();
  }
});

test("a route handler's 404 (an OG image for a made-up slug) stays off the disk and expires", async () => {
  const s = sandbox();
  const H = Handler as unknown as { emptyTtlMs: number };
  const before = H.emptyTtlMs;
  H.emptyTtlMs = 20;
  try {
    const key = `/news/${junk()}/opengraph-image`;
    const route = (status: number) => ({ kind: "APP_ROUTE", body: Buffer.from("x"), status, headers: {} });
    await s.cache.set(key, route(404), { cacheControl: { revalidate: 86400, expire: 31536000 } });
    assert.deepEqual(s.filesUnder("server"), [], "no .body/.meta files for a 404");
    assert.equal((await s.cache.get(key, { kind: "APP_ROUTE" }))?.value?.status, 404);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(await s.cache.get(key, { kind: "APP_ROUTE" }), null, "an old 404 renders again");
    const okKey = `/news/${junk()}/opengraph-image`;
    await s.cache.set(okKey, route(200), { cacheControl: { revalidate: 86400, expire: 31536000 } });
    assert.ok(s.filesUnder("server").length > 0, "a real image is written to disk");
  } finally {
    H.emptyTtlMs = before;
    s.cleanup();
  }
});
