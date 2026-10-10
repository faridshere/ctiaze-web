import { test } from "node:test";
import assert from "node:assert/strict";
import { ttlMemo } from "../lib/memo.ts";

test("ttlMemo shares one call per key inside the window, including in-flight", async () => {
  let calls = 0;
  const f = ttlMemo(async (n: number) => {
    calls++;
    await new Promise((r) => setTimeout(r, 5));
    return n * 2;
  }, 60_000, 10);
  const [a, b] = await Promise.all([f(2), f(2)]);
  assert.equal(a, 4);
  assert.equal(b, 4);
  assert.equal(await f(2), 4);
  assert.equal(calls, 1, "concurrent and later calls with the same key must share one read");
  assert.equal(await f(3), 6);
  assert.equal(calls, 2, "a different key is its own read");
});

test("ttlMemo re-reads after the TTL expires", async () => {
  let calls = 0;
  const f = ttlMemo(async () => ++calls, 10, 10);
  assert.equal(await f(), 1);
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(await f(), 2);
});

test("ttlMemo never caches a failure", async () => {
  let calls = 0;
  const f = ttlMemo(async () => {
    calls++;
    if (calls === 1) throw new Error("db down");
    return "ok";
  }, 60_000, 10);
  await assert.rejects(f(), /db down/);
  await new Promise((r) => setImmediate(r));
  assert.equal(await f(), "ok", "the read after an outage must hit the source again");
  assert.equal(calls, 2);
});

test("ttlMemo is bounded and evicts the least recently used key", async () => {
  let calls = 0;
  const f = ttlMemo(async (k: string) => {
    calls++;
    return k;
  }, 60_000, 2);
  await f("a");
  await f("b");
  await f("a"); // a is now the most recently used
  await f("c"); // evicts b
  assert.equal(calls, 3);
  await f("a");
  assert.equal(calls, 3, "a survived the eviction");
  await f("b");
  assert.equal(calls, 4, "b was evicted and is read again");
});
