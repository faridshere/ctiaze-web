import { test } from "node:test";
import assert from "node:assert/strict";
import { dilAlternates, localizedMeta } from "../lib/seo.ts";

// The site went English-only + global (2026-08-30): getLocale() is hardcoded
// "en", the ?dil= language split is dead, and the brand domain is skopnix.com.
// These tests lock in the new contract: one clean self-referencing canonical
// per path, NO hreflang cluster, og:url identical to the canonical.

test("canonical is the bare skopnix.com URL for the path", () => {
  assert.equal(dilAlternates("/cve").canonical, "https://skopnix.com/cve");
  assert.equal(dilAlternates("/").canonical, "https://skopnix.com/");
});

test("no hreflang cluster is minted (English-only site)", () => {
  const a = dilAlternates("/cve");
  assert.equal("languages" in a ? a.languages : undefined, undefined);
});

test("localizedMeta picks the locale copy and og:url matches the canonical", () => {
  const en = localizedMeta({ path: "/exposure", en: true,
    azTitle: "AZ T", enTitle: "EN T", azDesc: "AZ D", enDesc: "EN D" });
  assert.equal(en.title, "EN T");
  assert.equal(en.description, "EN D");
  assert.equal(en.alternates?.canonical, "https://skopnix.com/exposure");
  assert.equal((en.openGraph as { url?: string })?.url, "https://skopnix.com/exposure");

  // The AZ branch is dead code while getLocale() is hardcoded, but the strings
  // are still wired through — keep the contract honest until they're removed.
  const az = localizedMeta({ path: "/exposure", en: false,
    azTitle: "AZ T", enTitle: "EN T", azDesc: "AZ D", enDesc: "EN D" });
  assert.equal(az.title, "AZ T");
  assert.equal(az.alternates?.canonical, "https://skopnix.com/exposure");
});
