import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { issueChallenge, verifyPow, type Challenge } from "../lib/pow.ts";

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

test("a correctly solved challenge verifies", () => {
  const chal = issueChallenge();
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(header(chal, nonce)), true);
});

test("the same solved header cannot be replayed", () => {
  const chal = issueChallenge();
  const h = header(chal, solve(chal.c, chal.d));
  assert.equal(verifyPow(h), true);
  assert.equal(verifyPow(h), false, "second use of the same (challenge, nonce) must be rejected");
});

test("a tampered signature is rejected", () => {
  const chal = issueChallenge();
  const nonce = solve(chal.c, chal.d);
  const lastChar = chal.s.at(-1);
  const flipped = chal.s.slice(0, -1) + (lastChar === "0" ? "1" : "0");
  assert.equal(verifyPow(header({ ...chal, s: flipped }, nonce)), false);
});

test("a nonce with insufficient leading zero bits is rejected", () => {
  const chal = issueChallenge();
  // Find the first small nonce that provably does NOT meet the difficulty —
  // brute-forcing "the" solution would defeat the point of this test.
  let short = "0";
  for (let i = 0; ; i++) {
    const n = i.toString(36);
    if (leadingZeroBits(sha256hex(`${chal.c}:${n}`)) < chal.d) { short = n; break; }
  }
  assert.equal(verifyPow(header(chal, short)), false);
});

test("a header older than the 2-minute TTL is rejected", () => {
  const chal = issueChallenge();
  const nonce = solve(chal.c, chal.d);
  const stale = { ...chal, t: chal.t - 130_000 }; // 2m10s old, past the 120s TTL
  assert.equal(verifyPow(header(stale, nonce)), false);
});

test("malformed headers are rejected without throwing", () => {
  assert.equal(verifyPow(null), false);
  assert.equal(verifyPow(undefined), false);
  assert.equal(verifyPow(""), false);
  assert.equal(verifyPow("only.three.parts"), false); // 3 parts, not 4
  const chal = issueChallenge();
  const nonce = solve(chal.c, chal.d);
  assert.equal(verifyPow(`not-hex.${chal.t}.${chal.s}.${nonce}`), false); // non-hex challenge
  assert.equal(verifyPow(`${chal.c}.${chal.t}.not-hex.${nonce}`), false); // non-hex signature
});
