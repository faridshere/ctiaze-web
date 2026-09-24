import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createRequire, register } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

// lib/isr-cache-handler.mjs is Next's own file-system ISR cache with one
// change: a 404 page is kept in memory, never written to disk (2026-09-24,
// self-hosting). These tests drive the real handler against a temp dist dir,
// the way Next's IncrementalCache constructs it.

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

function page(status: number) {
  return { kind: "APP_PAGE", html: "<html></html>", rscData: Buffer.from("rsc"), headers: {}, status, postponed: undefined, segmentData: undefined };
}

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

test("a real page and a data-cache entry are still written to disk", async () => {
  const s = sandbox();
  try {
    const key = `/cve/CVE-2021-${Math.random().toString().slice(2, 9)}`;
    await s.cache.set(key, page(200), {});
    const written = s.filesUnder("server/app").map(String);
    assert.ok(written.some((f) => f.endsWith(".html")) && written.some((f) => f.endsWith(".meta")), written.join(", "));

    // unstable_cache data lands in .next/cache/fetch-cache, the persistent volume.
    await s.cache.set(`fetch-${Math.random()}`, { kind: "FETCH", data: { headers: {}, body: "{}", status: 200 }, revalidate: 3600 }, { fetchCache: true, tags: [] });
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
