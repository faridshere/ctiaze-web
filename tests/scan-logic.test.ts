// Pure-logic regression tests for the scan-me + permalink fixes. Run with the
// Node built-in runner (type stripping, zero deps): `npm test` → `node --test tests/`.
// These guard the silent-logic bugs the scan-me audit found; the route/UI layers are
// covered by tsc + eslint + next build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, storyIdKey } from "../lib/slug.ts";
import { breachActions } from "../lib/breachactions.ts";
import { jsonLdSafe } from "../lib/format.ts";
import { classifyAddress } from "../lib/addressclass.ts";

// ── slug ↔ _id round-trip ────────────────────────────────────────────────────
// The invariant getStoryBySlug relies on: for every id family, the key recovered
// from the slug must be a prefix of the original _id (so `^(prefix)<key>` matches).
function roundTrips(id: string, title: string): boolean {
  const key = storyIdKey(slugify(id, title));
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(cve:|url:|digest:|spike:)${escaped}`).test(id);
}

test("digest permalink round-trips (the 11-char-id trailing-hyphen bug)", () => {
  // Engine week ids are always zero-padded: AZ-YYYY-Wnn (11 chars, W01–W53).
  assert.ok(roundTrips("digest:AZ-2026-W33", "Həftəlik exposure digest — Azərbaycan 2026-W33"));
  assert.ok(roundTrips("digest:AZ-2026-W01", "İlk həftənin digesti"));
});

test("spike / cve / url permalinks still round-trip unchanged", () => {
  assert.ok(roundTrips("spike:AZ-2026-08-05", "RDP exposure spike"));
  assert.ok(roundTrips("cve:CVE-2026-1234", "Kritik boşluq"));
  assert.ok(roundTrips("cve:CVE-2026-0001", "Min sıralı CVE"));
  assert.ok(roundTrips("url:a1b2c3d4e5f6a7b8", "Adi xəbər başlığı"));
});

test("storyIdKey strips a trailing join hyphen but leaves inner ids intact", () => {
  assert.equal(storyIdKey("AZ-2026-W33-həftəlik-digest"), "AZ-2026-W33");
  assert.equal(storyIdKey("AZ-2026-08-05-rdp-spike"), "AZ-2026-08-0"); // spike: no trailing hyphen at 12
  assert.equal(storyIdKey("CVE-2026-1234-kritik"), "CVE-2026-123");
});

// ── breachActions: no fabricated doxxing claim ───────────────────────────────
test("'Email addresses' does NOT trigger the physical-address/doxxing action", () => {
  const acts = breachActions(["Email addresses"], {}, "az");
  const az = acts.map((a) => a.az).join(" | ");
  assert.ok(!/Ünvan\/məkan/.test(az), "must not claim address/location exposure");
  assert.ok(/fişinq/i.test(az), "should give the email→phishing action instead");
});

test("'IP addresses' maps to the low profile-data action, not doxxing", () => {
  const acts = breachActions(["IP addresses"], {}, "en");
  const en = acts.map((a) => a.en).join(" | ");
  assert.ok(!/Address\/location data is exposed/.test(en));
  assert.ok(acts.length > 0);
});

test("real location classes still map to the doxxing/address action", () => {
  for (const cls of ["Physical addresses", "Home address", "Geographic locations", "Geolocation"]) {
    const en = breachActions([cls], {}, "en").map((a) => a.en).join(" | ");
    assert.ok(/Address\/location data is exposed/.test(en), `${cls} should hit the address rule`);
  }
});

test("password class still yields the critical password action", () => {
  const acts = breachActions(["Passwords"], { passwordsExposed: true }, "en");
  assert.equal(acts[0].risk, "critical");
  assert.ok(/2FA/.test(acts[0].en));
});

test("AZ-localized follow-up rides along on the phone rule", () => {
  const acts = breachActions(["Phone numbers"], {}, "az");
  assert.ok(acts.some((a) => a.az_local && /Azercell|Bakcell|Nar/.test(a.az_local)));
});

// ── jsonLdSafe: XSS hole in JSON-LD injection ────────────────────────────────
test("jsonLdSafe escapes < and > so a hostile headline can't break out of <script>", () => {
  const out = jsonLdSafe({ headline: "</script><script>alert(1)//" });
  assert.ok(!out.includes("</script>"), "must not contain a literal closing script tag");
  assert.ok(out.includes("\\u003c"), "< must be unicode-escaped");
  // still valid JSON that parses back to the original value
  assert.equal(JSON.parse(out).headline, "</script><script>alert(1)//");
});

// ── classifyAddress: shared/synthetic detection ──────────────────────────────
test("placeholder, role and disposable addresses are flagged shared; personal is not", () => {
  assert.equal(classifyAddress("test@example.com").kind, "example");
  assert.equal(classifyAddress("namiq@example.az").kind, "example"); // the UI's own suggestion
  assert.equal(classifyAddress("info@realcompany.az").kind, "role");
  assert.equal(classifyAddress("someone@mailinator.com").kind, "disposable");
  const personal = classifyAddress("aysel.mammadova@gmail.com");
  assert.equal(personal.kind, "personal");
  assert.equal(personal.shared, false);
  assert.ok(classifyAddress("test@example.com").shared);
});
