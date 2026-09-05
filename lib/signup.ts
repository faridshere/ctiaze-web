import { createHash } from "crypto";

// Pure parsing for the early-access signup form, extracted from the waitlist
// route so the validation rules (trim/lowercase, the email shape, the length
// caps) are unit-testable without a Request object or a live Mongo connection.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Signup = { email: string; source: string };

export function parseSignup(body: unknown): Signup | { error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  const source = String(b.source ?? "site").slice(0, 40);
  if (!EMAIL.test(email) || email.length > 254) {
    return { error: "Enter a valid email address" };
  }
  return { email, source };
}

// Anonymized per-signup fingerprint (never the raw user-agent/IP), so the
// admin dashboard can spot "same browser, many emails" abuse without storing
// anything reversible.
export function uaHash(userAgent: string, ip: string): string {
  return createHash("sha256").update(`${userAgent}|${ip}`).digest("hex").slice(0, 16);
}
