import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { register } from "node:module";
import type { Challenge } from "../lib/pow.ts";

// lib/pow.ts imports ./ratelimit without an extension (bundler resolution).
register("./ts-ext-loader.mjs", import.meta.url);
const { issueChallenge, verifyPow } = await import("../lib/pow.ts");

// Minimal reimplementation of the client's solver (lib/pow-client.ts) using
// Node's crypto instead of the browser-safe hand-rolled SHA-256 the client
// ships — same "c:nonce" preimage and base36 nonce, so it produces headers
// the server's verifyPow actually accepts.
function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const v = parseInt(ch, 16);
    if (v === 0) { bits += 4; continue; }
    bits += Math.clz32(v) - 28;
    break;
  }
  return bits;
}

function solve(c: string, d: number): string {
  for (let nonce = 0; ; nonce++) {
    const n = nonce.toString(36);
    if (leadingZeroBits(sha256hex(`${c}:${n}`)) >= d) return n;
  }
}

function header(chal: Challenge, nonce: string): string {
  return `${chal.c}.${chal.t}.${chal.s}.${nonce}`;
}

// A challenge is signed for the caller's network, so every call has to name one.
const IP = "198.51.100.7";

test("a correctly solved challenge verifies", () => {
  const chal = issueChallenge(IP);
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(header(chal, nonce), IP), true);
});

test("the same solved header cannot be replayed", () => {
  const chal = issueChallenge(IP);
  const h = header(chal, solve(chal.c, chal.d));
  assert.equal(verifyPow(h, IP), true);
  assert.equal(verifyPow(h, IP), false, "second use of the same (challenge, nonce) must be rejected");
});

test("a tampered signature is rejected", () => {
  const chal = issueChallenge(IP);
  const nonce = solve(chal.c, chal.d);
  const lastChar = chal.s.at(-1);
  const flipped = chal.s.slice(0, -1) + (lastChar === "0" ? "1" : "0");
  assert.equal(verifyPow(header({ ...chal, s: flipped }, nonce), IP), false);
});

test("a nonce with insufficient leading zero bits is rejected", () => {
  const chal = issueChallenge(IP);
  // Find the first small nonce that provably does NOT meet the difficulty —
  // brute-forcing "the" solution would defeat the point of this test.
  let short = "0";
  for (let i = 0; ; i++) {
    const n = i.toString(36);
    if (leadingZeroBits(sha256hex(`${chal.c}:${n}`)) < chal.d) { short = n; break; }
  }
  assert.equal(verifyPow(header(chal, short), IP), false);
});

test("a header older than the 2-minute TTL is rejected", () => {
  const chal = issueChallenge(IP);
  const nonce = solve(chal.c, chal.d);
  const stale = { ...chal, t: chal.t - 130_000 }; // 2m10s old, past the 120s TTL
  assert.equal(verifyPow(header(stale, nonce), IP), false);
});

test("malformed headers are rejected without throwing", () => {
  assert.equal(verifyPow(null, IP), false);
  assert.equal(verifyPow(undefined, IP), false);
  assert.equal(verifyPow("", IP), false);
  assert.equal(verifyPow("only.three.parts", IP), false); // 3 parts, not 4
  const chal = issueChallenge(IP);
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(`not-hex.${chal.t}.${chal.s}.${nonce}`, IP), false); // non-hex challenge
  assert.equal(verifyPow(`${chal.c}.${chal.t}.not-hex.${nonce}`, IP), false); // non-hex signature
});

test("a token minted for one network is worthless from another", () => {
  // The reason this binding exists: a pentest forged a valid token offline in
  // 14ms and replayed it from anywhere. Solving is still cheap — what is no
  // longer cheap is doing it once and using it everywhere.
  const chal = issueChallenge(IP);
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(header(chal, nonce), "203.0.113.9"), false);
});

test("the same network still verifies when the last octet changes", () => {
  // Binding is coarse on purpose (IPv4 /24): a phone that moves inside its
  // carrier's block must still be able to submit the form it just solved for.
  const chal = issueChallenge("198.51.100.7");
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(header(chal, nonce), "198.51.100.212"), true);
});

test("an IPv6 caller is bound to its /48, however the address is written", () => {
  // The old split(":") took "2001:db8::1" as the network "2001:db8:", so the
  // same /48 written with and without "::" were two networks, and any
  // "2001:db8::..." address matched any other.
  const chal = issueChallenge("2001:db8:0:1::5");
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(header(chal, nonce), "2001:0db8:0000:ffff::9"), true, "same /48, different spelling");
  const other = issueChallenge("2001:db8::1");
  assert.equal(verifyPow(header(other, solve(other.c, other.d)), "2001:db8:1::1"), false, "the next /48 is another network");
});

test("an IPv4-mapped caller is bound to its IPv4 /24, not one shared ::ffff network", () => {
  const chal = issueChallenge("::ffff:198.51.100.7");
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(header(chal, nonce), "198.51.100.9"), true);
  const other = issueChallenge("::ffff:198.51.100.7");
  assert.equal(verifyPow(header(other, solve(other.c, other.d)), "::ffff:203.0.113.7"), false);
});

test("a blank or unknown ip does not throw", () => {
  const chal = issueChallenge(undefined);
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(header(chal, nonce), undefined), true);
});
