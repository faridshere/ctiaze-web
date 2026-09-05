import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSignup, uaHash } from "../lib/signup.ts";

test("happy path: trims and lowercases the email, keeps the given source", () => {
  const out = parseSignup({ email: "  Person@Example.COM  ", source: "story:inline" });
  assert.deepEqual(out, { email: "person@example.com", source: "story:inline" });
});

test("source defaults to 'site' when absent", () => {
  const out = parseSignup({ email: "a@b.co" });
  assert.deepEqual(out, { email: "a@b.co", source: "site" });
});

test("source is capped at 40 characters", () => {
  const out = parseSignup({ email: "a@b.co", source: "x".repeat(80) });
  assert.ok(!("error" in out));
  assert.equal(("source" in out ? out.source : "").length, 40);
});

test("rejects malformed emails", () => {
  for (const bad of ["not-an-email", "a@b", "@b.co", "a@.co", ""]) {
    const out = parseSignup({ email: bad });
    assert.ok("error" in out, `${JSON.stringify(bad)} should be rejected`);
  }
});

test("rejects emails over 254 characters", () => {
  const long = "a".repeat(250) + "@b.co"; // 255 chars, otherwise a valid shape
  const out = parseSignup({ email: long });
  assert.ok("error" in out);
});

test("non-object bodies don't throw and are rejected", () => {
  for (const body of [null, undefined, "x", 42, [], true]) {
    const out = parseSignup(body);
    assert.ok("error" in out, `${JSON.stringify(body)} should be rejected, not throw`);
  }
});

test("uaHash is a deterministic 16-char hex fingerprint of user-agent + ip", () => {
  const h1 = uaHash("Mozilla/5.0", "1.2.3.4");
  const h2 = uaHash("Mozilla/5.0", "1.2.3.4");
  const h3 = uaHash("Mozilla/5.0", "5.6.7.8");
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.match(h1, /^[0-9a-f]{16}$/);
});
