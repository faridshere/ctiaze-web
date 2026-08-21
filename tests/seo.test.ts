import { test } from "node:test";
import assert from "node:assert/strict";
import { dilAlternates, localizedMeta } from "../lib/seo.ts";

test("bare URL keeps a bare canonical + full hreflang cluster", () => {
  const a = dilAlternates("/cve");
  assert.equal(a.canonical, "https://ctiaze.tech/cve");
  assert.deepEqual(a.languages, {
    az: "https://ctiaze.tech/cve?dil=az",
    en: "https://ctiaze.tech/cve?dil=en",
    "x-default": "https://ctiaze.tech/cve",
  });
});

test("each forced ?dil variant is SELF-canonical (the whole point)", () => {
  assert.equal(dilAlternates("/cve", "az").canonical, "https://ctiaze.tech/cve?dil=az");
  assert.equal(dilAlternates("/cve", "en").canonical, "https://ctiaze.tech/cve?dil=en");
});

test("junk ?dil falls back to the bare canonical (no duplicate minting)", () => {
  assert.equal(dilAlternates("/cve", "xx").canonical, "https://ctiaze.tech/cve");
  assert.equal(dilAlternates("/", "'; DROP").canonical, "https://ctiaze.tech/");
});

test("localizedMeta picks the locale copy and og:url matches the canonical", () => {
  const en = localizedMeta({ path: "/exposure", dil: "en", en: true,
    azTitle: "AZ T", enTitle: "EN T", azDesc: "AZ D", enDesc: "EN D" });
  assert.equal(en.title, "EN T");
  assert.equal(en.description, "EN D");
  assert.equal(en.alternates?.canonical, "https://ctiaze.tech/exposure?dil=en");
  assert.equal((en.openGraph as { url?: string })?.url, "https://ctiaze.tech/exposure?dil=en");

  const az = localizedMeta({ path: "/exposure", en: false,
    azTitle: "AZ T", enTitle: "EN T", azDesc: "AZ D", enDesc: "EN D" });
  assert.equal(az.title, "AZ T");
  assert.equal(az.alternates?.canonical, "https://ctiaze.tech/exposure");
});
