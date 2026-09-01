import { createHmac, randomBytes, createHash } from "crypto";

// ---------------------------------------------------------------------------
// Invisible proof-of-work gate for the abuse-prone endpoints (/api/scan,
// /api/actors). The browser fetches a short-lived signed challenge from
// /api/challenge and burns a little CPU to solve it before the real call; the
// server re-checks the signature, freshness and the work. Real users never see
// it (the token is pre-solved on mount); scripted bulk abuse pays CPU + a
// round-trip per call, on top of the per-IP rate limit.
//
// SECRET is NOT a real secret — it ships in the server bundle. It only stops a
// caller forging "this challenge came from us"; the actual cost is the work.
// Bumping the version string invalidates every outstanding challenge.
// ---------------------------------------------------------------------------
const SECRET = "skopnix.pow.v1";
export const POW_DIFFICULTY = 16; // leading zero BITS the solution hash must have
const TTL_MS = 120_000; // a solved challenge is accepted for ~2 minutes
const SKEW_MS = 5_000; // tolerate a little clock skew into the future

export type Challenge = { c: string; t: number; s: string; d: number };

function sign(c: string, t: number): string {
  return createHmac("sha256", SECRET).update(`${c}.${t}`).digest("hex").slice(0, 24);
}

export function issueChallenge(): Challenge {
  const c = randomBytes(12).toString("hex");
  const t = Date.now();
  return { c, t, s: sign(c, t), d: POW_DIFFICULTY };
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const v = parseInt(ch, 16);
    if (v === 0) { bits += 4; continue; }
    bits += Math.clz32(v) - 28; // clz32 of a 4-bit value → zeros within the nibble
    break;
  }
  return bits;
}

// Small per-instance replay guard: a solved (challenge, nonce) can't be reused.
// Best-effort in serverless (instances don't share memory), but the short TTL +
// per-IP rate limit already bound replay; this closes the trivial in-instance case.
const used = new Map<string, number>();
function seenBefore(key: string): boolean {
  const now = Date.now();
  if (used.size > 5000) for (const [k, exp] of used) if (exp < now) used.delete(k);
  if (used.has(key)) return true;
  used.set(key, now + TTL_MS);
  return false;
}

// header format: `${c}.${t}.${s}.${nonce}`
export function verifyPow(header: string | null | undefined): boolean {
  if (!header) return false;
  const parts = header.split(".");
  if (parts.length !== 4) return false;
  const [c, tStr, s, nonce] = parts;
  const t = Number(tStr);
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  if (now - t > TTL_MS || t - now > SKEW_MS) return false; // fresh only
  if (!/^[0-9a-f]{24}$/.test(c) || !/^[0-9a-f]{24}$/.test(s)) return false;
  if (nonce.length > 32 || !/^[0-9a-z]+$/i.test(nonce)) return false;
  if (sign(c, t) !== s) return false; // we issued this challenge
  if (leadingZeroBits(sha256hex(`${c}:${nonce}`)) < POW_DIFFICULTY) return false; // work done
  if (seenBefore(`${c}:${nonce}`)) return false; // not replayed
  return true;
}
