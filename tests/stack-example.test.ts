import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// lib/stack/example.ts imports ../citations (and it ./actor-aliases) without
// extensions; the loader resolves them. No database: every input is a fixture.
register("./ts-ext-loader.mjs", import.meta.url);
const { pickExample, exampleCveIds, utcStamp, EXAMPLE_QUOTE_MAX } = await import("../lib/stack/example.ts");

const NOW = new Date("2026-10-17T21:00:00Z");
const QUOTE = "Volt Typhoon exploited CVE-2024-21762 in FortiOS SSL VPN appliances to gain initial access.";

function cit(over: Record<string, unknown> = {}) {
  return {
    _id: "c1",
    cve: "CVE-2024-21762",
    actor_id: "volt-typhoon",
    actor_text: "Volt Typhoon",
    relation: "exploited",
    quote: QUOTE,
    url: "https://example.org/report",
    host: "example.org",
    extracted_at: "2026-10-16T08:00:00Z",
    actor_in_quote: true,
    ...over,
  };
}

const KEV = new Map([
  ["CVE-2024-21762", { vendor: "Fortinet", product: "FortiOS", dateAdded: "2024-02-09", ransomware: false }],
  ["CVE-2023-27997", { vendor: "Fortinet", product: "FortiOS", dateAdded: "2023-06-13", ransomware: true }],
]);
const EPSS = new Map([
  ["CVE-2024-21762", 0.834],
  ["CVE-2023-27997", 0.857],
]);
const NAMES = new Map([["volt-typhoon", "Volt Typhoon"]]);

test("a cited, KEV-listed CVE with EPSS becomes the example, with every field from its inputs", () => {
  const ex = pickExample([cit()], KEV, EPSS, NAMES, NOW);
  assert.ok(ex);
  assert.equal(ex.cve, "CVE-2024-21762");
  assert.equal(ex.vendor, "Fortinet");
  assert.equal(ex.product, "FortiOS");
  assert.equal(ex.kevAdded, "2024-02-09");
  assert.equal(ex.epss, 0.834);
  assert.deepEqual(ex.actor, { id: "volt-typhoon", name: "Volt Typhoon", dossier: true });
  assert.equal(ex.quote, QUOTE);
  assert.equal(ex.href, "https://example.org/report");
  assert.equal(ex.sourceLabel, "example.org");
  assert.equal(ex.relation, "exploited");
  assert.equal(ex.generatedAt, NOW.toISOString());
});

test("nothing qualifies without KEV, EPSS, a quote or an http(s) source", () => {
  assert.equal(pickExample([cit({ cve: "CVE-2021-0001" })], KEV, EPSS, NAMES, NOW), null, "not in KEV");
  assert.equal(pickExample([cit()], KEV, new Map(), NAMES, NOW), null, "no EPSS");
  assert.equal(pickExample([cit({ quote: "" })], KEV, EPSS, NAMES, NOW), null, "no quote");
  assert.equal(pickExample([cit({ url: "javascript:alert(1)" })], KEV, EPSS, NAMES, NOW), null, "unsafe url");
  assert.equal(pickExample([cit({ url: null })], KEV, EPSS, NAMES, NOW), null, "no url");
  assert.equal(pickExample([cit({ cve: 42 })], KEV, EPSS, NAMES, NOW), null, "malformed row");
  assert.equal(pickExample([], KEV, EPSS, NAMES, NOW), null);
});

test("an out-of-range EPSS is not printed", () => {
  assert.equal(pickExample([cit()], KEV, new Map([["CVE-2024-21762", 1.5]]), NAMES, NOW), null);
  assert.equal(pickExample([cit()], KEV, new Map([["CVE-2024-21762", Number.NaN]]), NAMES, NOW), null);
});

test("a KEV row without a vendor or product cannot name what was pasted", () => {
  const kev = new Map([["CVE-2024-21762", { vendor: "", product: "FortiOS", dateAdded: null, ransomware: false }]]);
  assert.equal(pickExample([cit()], kev, EPSS, NAMES, NOW), null);
});

test("dossier actors, the strongest relation and in-quote names win; then the newest", () => {
  const rows = [
    cit({ _id: "a", actor_id: "nobody", actor_text: "Some Crew", extracted_at: "2026-10-17T10:00:00Z" }),
    cit({ _id: "b", relation: "attributed_by_report", extracted_at: "2026-10-17T09:00:00Z" }),
    cit({ _id: "c", actor_in_quote: false, extracted_at: "2026-10-17T08:00:00Z" }),
    cit({ _id: "d", cve: "CVE-2023-27997", extracted_at: "2026-10-15T08:00:00Z" }),
    cit({ _id: "e", extracted_at: "2026-10-16T08:00:00Z" }),
  ];
  const ex = pickExample(rows, KEV, EPSS, NAMES, NOW);
  assert.ok(ex);
  assert.equal(ex.cve, "CVE-2024-21762", "the newest strong, in-quote, dossier row");
  assert.equal(ex.relation, "exploited");
  assert.equal(ex.actor.dossier, true);
});

test("an actor without a dossier is printed by the source's own name, unlinked", () => {
  const ex = pickExample([cit({ actor_id: "nobody", actor_text: "Some Crew" })], KEV, EPSS, NAMES, NOW);
  assert.ok(ex);
  assert.deepEqual(ex.actor, { id: "nobody", name: "Some Crew", dossier: false });
});

test("a long quote is cut at the front-page cap with an ellipsis, never rewritten", () => {
  const long = `${QUOTE} ${"More detail from the report. ".repeat(30)}`;
  const ex = pickExample([cit({ quote: long })], KEV, EPSS, NAMES, NOW);
  assert.ok(ex);
  assert.ok(ex.quote.length <= EXAMPLE_QUOTE_MAX);
  assert.ok(ex.quote.endsWith("…"));
  assert.ok(long.startsWith(ex.quote.slice(0, -1)));
});

test("lower-case CVE ids from the engine are normalised", () => {
  const ex = pickExample([cit({ cve: "cve-2024-21762" })], KEV, EPSS, NAMES, NOW);
  assert.equal(ex?.cve, "CVE-2024-21762");
});

test("exampleCveIds lists only KEV-listed CVEs with displayable citations, once each", () => {
  const ids = exampleCveIds([cit(), cit({ _id: "x" }), cit({ cve: "CVE-2021-0001" }), cit({ cve: "CVE-2023-27997", quote: "" })], KEV);
  assert.deepEqual(ids, ["CVE-2024-21762"]);
});

test("utcStamp prints HH:MM UTC, adds the date for an earlier day, and refuses missing dates", () => {
  assert.equal(utcStamp("2026-10-17T21:04:59Z"), "21:04 UTC");
  assert.equal(utcStamp("2026-10-17T21:04:59Z", "2026-10-17T23:00:00Z"), "21:04 UTC");
  assert.equal(utcStamp("2026-10-16T21:04:00Z", "2026-10-17T01:00:00Z"), "16 Oct 21:04 UTC");
  assert.equal(utcStamp(new Date(0).toISOString()), null, "EMPTY_HOME_DATA's epoch is not a time");
  assert.equal(utcStamp(null), null);
  assert.equal(utcStamp("not a date"), null);
});
