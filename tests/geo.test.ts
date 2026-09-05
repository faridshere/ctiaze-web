import { test } from "node:test";
import assert from "node:assert/strict";
import { countryName, resolveCountry } from "../lib/geo.ts";

test("resolveCountry folds free-text spellings seen in the roster to ISO-2", () => {
  assert.equal(resolveCountry("Russian Federation"), "RU");
  assert.equal(resolveCountry("Türkiye"), "TR");
  assert.equal(resolveCountry("United States"), "US");
});

test("resolveCountry returns null for a non-country (alliance, not a place)", () => {
  assert.equal(resolveCountry("NATO"), null);
});

test("countryName returns the display name for a known ISO-2 code", () => {
  assert.equal(countryName("KP"), "North Korea");
});
