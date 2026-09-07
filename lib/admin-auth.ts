import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Auth for the admin dashboard. It shows signup emails and visitor IPs, so the
// rules here are deliberately strict:
//   * fails CLOSED — with no ADMIN_TOKEN set, nobody gets in, ever. A missing
//     env var must never mean "open to the world".
//   * the token is never put in a URL (query strings leak via Referer, browser
//     history, and access logs) — it is posted once and exchanged for a cookie.
//   * the cookie stores an HMAC derived from the token, not the token itself.
//   * comparisons are timing-safe.
//   * the cookie VALUE expires, not just the Set-Cookie maxAge. It used to be a
//     constant HMAC with no timestamp (found in the 2026-09-07 pentest), so a
//     copy taken from a log or a backup stayed valid for as long as the token
//     did and could not be revoked short of rotating ADMIN_TOKEN.
export const ADMIN_COOKIE = "skx_admin";
const SESSION_MESSAGE = "skopnix-admin-session-v2";
const SESSION_TTL_MS = 7 * 86_400_000; // matches the Set-Cookie maxAge

function secret(): string | null {
  const t = process.env.ADMIN_TOKEN;
  return t && t.length >= 16 ? t : null;
}

/** The signature half of a session cookie issued at `iat` for `token`. */
function sessionSig(token: string, iat: number): string {
  return createHmac("sha256", token).update(`${SESSION_MESSAGE}.${iat}`).digest("hex");
}

// Compares fixed-length digests of both sides, so an early length return can't
// leak how long ADMIN_TOKEN is.
function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", SESSION_MESSAGE).update(a).digest();
  const hb = createHmac("sha256", SESSION_MESSAGE).update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** True when the supplied token matches ADMIN_TOKEN. */
export function tokenIsValid(candidate: string): boolean {
  const s = secret();
  if (!s || !candidate) return false;
  return safeEqual(candidate, s);
}

export function newSessionValue(): string | null {
  const s = secret();
  if (!s) return null;
  const iat = Date.now();
  return `${iat}.${sessionSig(s, iat)}`;
}

/** True when the current request carries a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  const s = secret();
  if (!s) return false; // not configured => closed
  const jar = await cookies();
  const got = jar.get(ADMIN_COOKIE)?.value;
  if (!got) return false;
  const [iatStr, sig] = got.split(".");
  const iat = Number(iatStr);
  if (!Number.isFinite(iat) || !sig) return false;
  const age = Date.now() - iat;
  if (age < 0 || age > SESSION_TTL_MS) return false; // the VALUE expires, not just the cookie
  return safeEqual(sig, sessionSig(s, iat));
}

/** Whether an ADMIN_TOKEN is configured at all — used to explain the locked state. */
export function adminConfigured(): boolean {
  return secret() !== null;
}
