import { test } from "node:test";
import assert from "node:assert/strict";
import {
  claimsFilter,
  isNoise,
  isPublicClaim,
  MOTORSPORT_SRC,
  NOISE_CLAUSES,
  NOT_CYBER_SRC,
  parseRegion,
  regionOf,
  type ShapeDoc,
} from "../lib/claims-shape.ts";

// Neutral placeholders only: GroupX, example.az. The summary phrasings are the
// shapes the summary model writes for posts that are not claims.
const doc = (over: Partial<ShapeDoc> = {}): ShapeDoc => ({
  kind: "telegram",
  az: true,
  claim_like: true,
  text: "GroupX: example.az is down",
  summary: { claim_type: "ddos", summary_en: "GroupX claims a DDoS attack on example.az." },
  ...over,
});

test("region: legacy rows without a region field are Azerbaijan rows", () => {
  assert.equal(regionOf(doc()), "az");
  assert.equal(regionOf(doc({ region: null })), "az");
  assert.equal(regionOf(doc({ region: "az" })), "az");
  assert.equal(regionOf(doc({ region: "global", az: false })), "global");
  // A legacy row the AZ match did not fire on belongs to no region.
  assert.equal(regionOf(doc({ az: false })), null);
});

test("region: a row is public in its own section only", () => {
  const az = doc();
  const world = doc({ region: "global", az: false });
  assert.equal(isPublicClaim(az, "az"), true);
  assert.equal(isPublicClaim(az, "global"), false);
  assert.equal(isPublicClaim(world, "global"), true);
  assert.equal(isPublicClaim(world, "az"), false);
  assert.equal(isPublicClaim(az, "all"), true);
  assert.equal(isPublicClaim(world, "all"), true);
});

test("public kinds: dark-web never, telegram/bluesky only when claim-like", () => {
  assert.equal(isPublicClaim(doc({ kind: "darkweb" }), "az"), false);
  assert.equal(isPublicClaim(doc({ kind: "bluesky", claim_like: false }), "az"), false);
  assert.equal(isPublicClaim(doc({ kind: "ransomware", claim_like: false }), "az"), true);
});

test("noise: the engine's noise flag hides a row in every region", () => {
  assert.equal(isNoise(doc({ noise: true })), true);
  assert.equal(isPublicClaim(doc({ noise: true }), "az"), false);
  assert.equal(isPublicClaim(doc({ noise: true, region: "global" }), "global"), false);
  assert.equal(isNoise(doc({ noise: false })), false);
});

test("noise: 'other' rows whose summary says they are not a cyber claim", () => {
  const other = (summary_en: string) => doc({ kind: "bluesky", summary: { claim_type: "other", summary_en } });
  for (const s of [
    "Not a hacktivist or cybersecurity-related post.",
    "This post discusses regional politics, not a cybersecurity incident.",
    "No hacktivist activity, data breach, or attack is claimed.",
    "Political commentary; claims no cyberattack or data compromise.",
    "This post contains news headlines rather than a cyberattack claim.",
    "This post does not describe a cyber attack or security incident.",
    "No specific organization, website, or cybersecurity incident is identified.",
  ]) {
    assert.equal(isNoise(other(s)), true, s);
  }
  // An 'other' row that IS about a cyber incident stays.
  assert.equal(isNoise(other("Officials claim GroupX conducted cyberattacks against local media outlets.")), false);
  // The negation rule reads only 'other' rows: a DDoS claim that offers no proof stays.
  assert.equal(
    isNoise(doc({ summary: { claim_type: "ddos", summary_en: "GroupX claims a DDoS; no evidence of hacking is offered." } })),
    false,
  );
});

test("noise: explicit not-a-claim classifications", () => {
  assert.equal(isNoise(doc({ summary: { claim_type: "none" } })), true);
  assert.equal(isNoise(doc({ summary: { claim_type: "not_a_claim" } })), true);
});

test("noise: motorsport posts go, a real attack on a race site stays", () => {
  const f1 = (claim_type: string, summary_en: string) => doc({ kind: "bluesky", summary: { claim_type, summary_en } });
  assert.equal(isNoise(f1("other", "A Formula 1 driver receives a grid penalty at the Grand Prix.")), true);
  assert.equal(isNoise(f1("leak", "Claims to have leaked an FIA document summoning car 31.")), true);
  assert.equal(isNoise(doc({ kind: "telegram", summary: null, text: "Baku Grand Prix practice results" })), true);
  assert.equal(isNoise(f1("ddos", "GroupX claims a DDoS on the Grand Prix ticketing site.")), false);
  assert.equal(isNoise(f1("defacement", "GroupX claims to have defaced an F1 fan site.")), false);
  // A leak-site listing is always a claim.
  assert.equal(isNoise(doc({ kind: "ransomware", summary: null, text: "Formula Racing Example LLC" })), false);
});

test("regex sources compile the same way Mongo will read them", () => {
  // Mongo gets the source string with $options "i"; make sure both are valid
  // JS regexes too (Mongo's PCRE accepts this subset).
  assert.doesNotThrow(() => new RegExp(NOT_CYBER_SRC, "i"));
  assert.doesNotThrow(() => new RegExp(MOTORSPORT_SRC, "i"));
  const regexes = JSON.stringify(NOISE_CLAUSES).match(/"\$regex":"[^"]*"/g) ?? [];
  assert.equal(regexes.length, 3);
});

test("claimsFilter: every scope carries the public-kind and noise clauses", () => {
  for (const r of ["az", "global", "all"] as const) {
    const f = claimsFilter(r) as { $and: Record<string, unknown>[] };
    assert.equal(f.$and.length, 3);
    assert.deepEqual(f.$and[2], { $nor: NOISE_CLAUSES });
  }
  assert.deepEqual((claimsFilter("global") as { $and: unknown[] }).$and[0], { region: "global" });
  assert.deepEqual((claimsFilter("az") as { $and: unknown[] }).$and[0], {
    $or: [{ region: "az" }, { region: null, az: true }],
  });
});

test("parseRegion: az | global | all, default all", () => {
  assert.equal(parseRegion("az"), "az");
  assert.equal(parseRegion("global"), "global");
  assert.equal(parseRegion("all"), "all");
  assert.equal(parseRegion(null), "all");
  assert.equal(parseRegion("AZ"), "all");
  assert.equal(parseRegion("eu"), "all");
});
