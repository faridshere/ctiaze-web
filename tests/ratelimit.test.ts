import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, clientIp } from "../lib/ratelimit.ts";

test("rateLimit allows exactly N requests in a window, then denies", () => {
  const key = `test-window:${Math.random()}`;
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit(key, 5, 60_000), true, `request ${i + 1} of 5 should be allowed`);
  }
  assert.equal(rateLimit(key, 5, 60_000), false, "the 6th request in the same window must be denied");
});

test("each key gets its own independent bucket", () => {
  const a = `a:${Math.random()}`;
  const b = `b:${Math.random()}`;
  assert.equal(rateLimit(a, 1, 60_000), true);
  assert.equal(rateLimit(a, 1, 60_000), false);
  assert.equal(rateLimit(b, 1, 60_000), true, "a different key must not be affected by a's count");
});

test("clientIp prefers x-real-ip over x-forwarded-for", () => {
  const req = new Request("https://example.com", {
    headers: { "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 8.8.8.8" },
  });
  assert.equal(clientIp(req), "1.2.3.4");
});

test("clientIp falls back to the RIGHTMOST x-forwarded-for hop (the trusted proxy's own append)", () => {
  const req = new Request("https://example.com", {
    headers: { "x-forwarded-for": "9.9.9.9, 8.8.8.8, 7.7.7.7" },
  });
  assert.equal(clientIp(req), "7.7.7.7");
});

test("clientIp is 'unknown' with no IP headers at all", () => {
  const req = new Request("https://example.com");
  assert.equal(clientIp(req), "unknown");
});
