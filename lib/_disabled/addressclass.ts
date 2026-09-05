// Classify an email address so the scan can be honest about WHOSE exposure it is
// showing. A placeholder like test@example.com, a shared role mailbox like info@,
// or a disposable address returns hundreds of breaches that belong to everyone who
// ever used that address — not to the person scanning. Presenting that as their
// personal "Critical" exposure misattributes the risk, which the product's honesty
// rule forbids. Pure code over a bundled static list — no network call.

export type AddressKind = "personal" | "role" | "example" | "disposable";
export type AddressClass = { kind: AddressKind; shared: boolean };

// RFC 2606 / RFC 6761 reserved domains + the AZ example domain the scan UI itself
// suggests. Anything under these is a placeholder, never a real person's mailbox.
const RESERVED_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "example.edu", "example.az",
]);
const RESERVED_TLDS = new Set(["test", "invalid", "localhost", "example"]);

// Shared mailboxes: read by many people at an organisation, so breaches against them
// aren't one person's problem. Not exhaustive — the common set that dominates leaks.
const ROLE_LOCALS = new Set([
  "info", "admin", "administrator", "support", "sales", "noreply", "no-reply",
  "donotreply", "do-not-reply", "contact", "office", "hr", "help", "team",
  "service", "services", "billing", "abuse", "postmaster", "webmaster", "mail",
  "marketing", "careers", "jobs", "hello", "enquiries", "inquiries", "reception",
]);

// Throwaway providers — an address here is deliberately transient; its "breaches"
// are shared across countless one-time users.
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamailblock.com", "10minutemail.com",
  "tempmail.com", "temp-mail.org", "trashmail.com", "yopmail.com", "getnada.com",
  "throwawaymail.com", "maildrop.cc", "dispostable.com", "fakeinbox.com",
  "sharklasers.com", "mohmal.com", "emailondeck.com", "moakt.com", "tmpmail.org",
]);

export function classifyAddress(email: string): AddressClass {
  const e = (email || "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0 || at === e.length - 1) return { kind: "personal", shared: false };
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  const tld = domain.split(".").pop() || "";

  if (RESERVED_DOMAINS.has(domain) || RESERVED_TLDS.has(tld) || domain.endsWith(".example")) {
    return { kind: "example", shared: true };
  }
  if (DISPOSABLE.has(domain)) return { kind: "disposable", shared: true };
  if (ROLE_LOCALS.has(local)) return { kind: "role", shared: true };
  return { kind: "personal", shared: false };
}
