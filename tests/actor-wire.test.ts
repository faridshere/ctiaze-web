import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatcher, matchKeys } from "../lib/actor-match.ts";

// lib/actor-match.ts is the pure split-out of lib/actor-wire.ts's matcher —
// actor-wire.ts itself imports ./db, which throws at import time without
// MONGO_URI_READONLY, so it must stay untouched by this test file.

test("matchKeys keeps the primary name and structured aliases, drops junk and G-ids", () => {
  const keys = matchKeys("APT28", ["global", "Storm", "FANCY BEAR", "APT-C-20", "TA422", "UAC-0028", "G0007"]);
  assert.ok(keys.includes("APT28"), "primary name kept");
  assert.ok(!keys.includes("global"), "plain-word alias dropped");
  assert.ok(!keys.includes("Storm"), "plain-word alias dropped case-insensitively");
  assert.ok(keys.includes("FANCY BEAR"), "multi-word alias kept");
  assert.ok(keys.includes("APT-C-20"), "hyphenated alias kept");
  assert.ok(keys.includes("TA422"), "digit-bearing alias kept");
  assert.ok(keys.includes("UAC-0028"), "hyphenated + digit alias kept");
  assert.ok(!keys.includes("G0007"), "MITRE group id dropped");
});

test("buildMatcher matches a known alias case-insensitively with word boundaries", () => {
  const re = buildMatcher(matchKeys("APT28", ["FANCY BEAR"]));
  assert.ok(re, "a matcher is built when there are keys");
  assert.match("A report ties the intrusion to fancy bear infrastructure.", re!);
  assert.match("APT28 was observed reusing known tooling.", re!);
});

test("buildMatcher does not match a longer token that merely starts with the key", () => {
  const re = buildMatcher(matchKeys("APT28", []));
  assert.ok(re);
  assert.doesNotMatch("APT281 targeted a regional bank.", re!);
});
