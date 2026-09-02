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
export const ADMIN_COOKIE = "skx_admin";
const SESSION_MESSAGE = "skopnix-admin-session-v1";

function secret(): string | null {
  const t = process.env.ADMIN_TOKEN;
  return t && t.length >= 16 ? t : null;
}

/** The value we expect to find in the session cookie for the current token. */
function sessionValue(token: string): string {
  return createHmac("sha256", token).update(SESSION_MESSAGE).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** True when the supplied token matches ADMIN_TOKEN. */
export function tokenIsValid(candidate: string): boolean {
  const s = secret();
  if (!s || !candidate) return false;
  return safeEqual(candidate, s);
}

export function newSessionValue(): string | null {
  const s = secret();
  return s ? sessionValue(s) : null;
}

/** True when the current request carries a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  const s = secret();
  if (!s) return false; // not configured => closed
  const jar = await cookies();
  const got = jar.get(ADMIN_COOKIE)?.value;
  if (!got) return false;
  return safeEqual(got, sessionValue(s));
}

/** Whether an ADMIN_TOKEN is configured at all — used to explain the locked state. */
export function adminConfigured(): boolean {
  return secret() !== null;
}
