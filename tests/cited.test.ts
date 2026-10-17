import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// lib/cited.ts imports ./site, ./navigator and ./stix with extensionless
// specifiers (see tests/ts-ext-loader.mjs). Must run before the imports below.
register("./ts-ext-loader.mjs", import.meta.url);
const cited = await import("../lib/cited.ts");
const { stixBundle } = await import("../lib/stix.ts");
const { validateStix, validateObjects } = await import("./stix-schema.ts");
const { CITED_ACTOR, CITED_ROWS, CLAIMS, OTHER_ACTOR } = await import("./fixtures/cited.ts");

// Fixtures only, never the database: what is under test is the transform.
const bundle = cited.citedActorBundle(CITED_ACTOR, CITED_ROWS);
const byType = (t: string) => bundle.objects.filter((o) => o.type === t);
const rels = (type: string) => byType("relationship").filter((r) => r.relationship_type === type);

// The vendored common/bundle.json lists the 2.1 SDOs in a oneOf but leaves
// out location (and grouping, incident, note, opinion), so a location falls to
// its "custom object" branch, which it fails because it matches both core
// schemas. That is a gap in the upstream schema, not in the object: locations
// are checked against sdos/location.json by validateObjects() instead.
function assertValid(b: { objects: { type: string }[] }, objects: { type: string }[]) {
  const envelope = { ...b, objects: b.objects.filter((o) => o.type !== "location") };
  assert.deepEqual(validateStix(envelope), [], "bundle validates against common/bundle.json");
  assert.deepEqual(validateObjects(objects), [], "each object validates against its own type's schema");
}

test("the schema validator rejects real violations, so a pass means something", () => {
  const broken = structuredClone(bundle);
  broken.objects[2].created = "2026-01-01"; // no time part
  (broken.objects.find((o) => o.type === "relationship") as Record<string, unknown>).source_ref = "not-an-id";
  const errors = validateObjects(broken.objects);
  assert.ok(errors.some((e) => e.includes(".created")), errors.join("\n"));
  assert.ok(errors.some((e) => e.includes(".source_ref")), errors.join("\n"));
  assert.ok(validateStix({ type: "bundle", id: "bundle--x", objects: [] }).length > 0);
});

test("the cited actor bundle validates against the official STIX 2.1 schemas", () => {
  assertValid(bundle, bundle.objects);
});

test("the dossier bundle (lib/stix.ts) validates too", () => {
  const b = stixBundle(CITED_ACTOR);
  assertValid(b, b.objects);
});

test("every relationship is cited: a source URL plus the quote, in description and external_reference", () => {
  const all = byType("relationship");
  assert.ok(all.length > 0);
  for (const r of all) {
    const ref = r.external_references?.[0];
    assert.ok(ref?.url?.startsWith("https://"), `${r.id} has a source url`);
    assert.ok(ref?.source_name, `${r.id} names its source`);
    assert.equal(r.description, ref?.description, `${r.id} carries the quote twice`);
  }
});

test("rows without a usable source URL, or with a malformed id or indicator, are dropped", () => {
  const vulns = byType("vulnerability").map((v) => v.name);
  assert.deepEqual(vulns.sort(), ["CVE-2023-23397", "CVE-2024-0001"]);
  // the citation with url: null, the javascript: url and "CVE-23-1" never become objects
  assert.equal(rels("exploits").length, 3);
  assert.ok(!JSON.stringify(bundle).includes("javascript:"));
  assert.equal(byType("attack-pattern").length, 2); // "T99" is dropped
  const names = byType("indicator").map((i) => i.name);
  assert.ok(!names.includes("deadbeef"), "a 'sha256' of the wrong length is dropped");
});

test("exploits: intrusion-set → vulnerability; confidence 85 when the quote names the actor, 50 when not", () => {
  const set = byType("intrusion-set")[0];
  const byUrl = new Map(rels("exploits").map((r) => [r.external_references?.[0].url, r]));
  const strong = byUrl.get("https://research.example.com/apt28-outlook")!;
  const weak = byUrl.get("https://news.example.org/outlook-ntlm")!;
  assert.equal(strong.x_skopnix_actor_in_quote, true);
  assert.equal(weak.x_skopnix_actor_in_quote, false);
  assert.equal(strong.source_ref, set.id);
  assert.match(strong.target_ref ?? "", /^vulnerability--/);
  assert.equal(strong.confidence, 85);
  assert.equal(weak.confidence, 50);
  assert.equal(strong.x_skopnix_kev, true);
  assert.equal(strong.created, "2026-10-01T08:00:00.000Z", "created is when we extracted it, not now");
});

test("two reports citing the same CVE are two relationships, the same report twice is one", () => {
  const cve = byType("vulnerability").find((v) => v.name === "CVE-2023-23397")!;
  const onIt = rels("exploits").filter((r) => r.target_ref === cve.id);
  assert.equal(onIt.length, 2);
  assert.notEqual(onIt[0].external_references?.[0].url, onIt[1].external_references?.[0].url);
});

test("vulnerabilities carry the cve external_reference STIX requires", () => {
  for (const v of byType("vulnerability")) {
    assert.deepEqual(v.external_references?.[0].source_name, "cve");
    assert.equal(v.external_references?.[0].external_id, v.name);
  }
});

test("uses: attack-patterns share the dossier bundle's ids and collect every cited tactic", () => {
  const dossier = stixBundle(CITED_ACTOR);
  const t1078 = byType("attack-pattern").find((a) => a.name === "Valid Accounts")!;
  assert.ok(dossier.objects.some((o) => o.id === t1078.id), "same id as /actors/{id}/stix.json");
  assert.deepEqual(t1078.kill_chain_phases?.map((p) => p.phase_name).sort(), ["initial-access", "persistence"]);
  for (const r of rels("uses")) assert.match(r.target_ref ?? "", /^attack-pattern--/);
});

test("the intrusion-set is the very object the dossier bundle carries", () => {
  const dossierSet = stixBundle(CITED_ACTOR).objects.find((o) => o.type === "intrusion-set");
  assert.deepEqual(byType("intrusion-set")[0], dossierSet);
});

test("indicates: indicator → intrusion-set, with a correct pattern for every IOC type", () => {
  const set = byType("intrusion-set")[0];
  for (const r of rels("indicates")) {
    assert.match(r.source_ref ?? "", /^indicator--/);
    assert.equal(r.target_ref, set.id);
  }
  const patterns = new Map(byType("indicator").map((i) => [i.name, i.pattern]));
  const h = "a".repeat(64);
  assert.equal(patterns.get(h), `[file:hashes.'SHA-256' = '${h}']`);
  assert.equal(patterns.get("b".repeat(40)), `[file:hashes.'SHA-1' = '${"b".repeat(40)}']`);
  assert.equal(patterns.get("c".repeat(32)), `[file:hashes.MD5 = '${"c".repeat(32)}']`);
  assert.equal(patterns.get("evil.example.com"), "[domain-name:value = 'evil.example.com']", "refanged and lower-cased");
  assert.equal(patterns.get("203.0.113.7"), "[ipv4-addr:value = '203.0.113.7']");
  assert.equal(patterns.get("2001:db8::1"), "[ipv6-addr:value = '2001:db8::1']");
  assert.equal(patterns.get("http://evil.example.com/a'b"), "[url:value = 'http://evil.example.com/a\\'b']", "quote escaped");
  assert.equal(patterns.get("ops@evil.example.com"), "[email-addr:value = 'ops@evil.example.com']");
  assert.equal(patterns.get("dropper.exe"), "[file:name = 'dropper.exe']");
  for (const i of byType("indicator")) {
    assert.equal(i.pattern_type, "stix");
    assert.ok(i.valid_from);
  }
});

test("ids are deterministic: the same rows give the same bytes, and row order does not matter", () => {
  const again = cited.citedActorBundle(CITED_ACTOR, CITED_ROWS);
  assert.equal(JSON.stringify(again), JSON.stringify(bundle));
  const reversed = cited.citedActorBundle(CITED_ACTOR, {
    cves: [...CITED_ROWS.cves].reverse(),
    ttps: [...CITED_ROWS.ttps].reverse(),
    iocs: [...CITED_ROWS.iocs].reverse(),
  });
  const ids = (b: { objects: { id: string }[] }) => b.objects.map((o) => o.id).sort();
  assert.deepEqual(ids(reversed), ids(bundle));
  assert.equal(reversed.id, bundle.id);
});

test("pages get their own bundle id; ids are UUIDv5", () => {
  assert.notEqual(cited.citedActorBundle(CITED_ACTOR, CITED_ROWS, 2).id, bundle.id);
  const V5 = /--[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  for (const o of bundle.objects) if (o.type !== "marking-definition") assert.match(o.id, V5, o.id);
});

test("an actor with no citations still gets a valid, non-empty bundle", () => {
  const empty = cited.citedActorBundle(CITED_ACTOR, { cves: [], ttps: [], iocs: [] });
  assert.deepEqual(empty.objects.map((o) => o.type), ["marking-definition", "identity", "intrusion-set"]);
  assertValid(empty, empty.objects);
});

test("the CVE bundle: one vulnerability, every cited actor we hold a dossier for", () => {
  const actors = new Map([
    [CITED_ACTOR._id, CITED_ACTOR],
    [OTHER_ACTOR._id, OTHER_ACTOR],
  ]);
  const rows = [
    ...CITED_ROWS.cves.filter((r) => r.cve.toUpperCase() === "CVE-2023-23397"),
    { cve: "CVE-2023-23397", actor_id: "apt29", actor_in_quote: true, quote: "APT29 used it too.", url: "https://example.org/apt29" },
    // no dossier for this id: skipped, never invented from actor_text
    { cve: "CVE-2023-23397", actor_id: "nobody", actor_text: "Chinese hackers", quote: "x", url: "https://example.org/n" },
  ];
  const b = cited.citedCveBundle("CVE-2023-23397", rows, actors);
  assertValid(b, b.objects);
  assert.equal(b.objects.filter((o) => o.type === "vulnerability").length, 1);
  assert.deepEqual(b.objects.filter((o) => o.type === "intrusion-set").map((o) => o.name).sort(), ["APT28", "APT29"]);
  assert.equal(b.objects.filter((o) => o.type === "relationship").length, 3);
  assert.ok(!JSON.stringify(b).includes("Chinese hackers"));
});

test("hacktivist claims: a Low-confidence report, labelled unverified, that validates", () => {
  const objects = CLAIMS.flatMap((c) => cited.claimObjects(c));
  const unique = [...new Map(objects.map((o) => [o.id, o])).values()];
  const b = { type: "bundle", id: "bundle--4f1d3c7e-3f0a-4d6e-9d39-1d4f2f1c8a10", objects: [...cited.taxiiPrelude(), ...unique] };
  assertValid(b, b.objects);
  const reports = unique.filter((o) => o.type === "report");
  assert.equal(reports.length, 3);
  for (const r of reports) {
    assert.equal(r.confidence, 15);
    assert.ok(r.labels?.includes("unverified-claim"));
    assert.match(r.description ?? "", /^A CLAIM made by a third party/);
  }
  const actors = unique.filter((o) => o.type === "threat-actor");
  // the bluesky row is a tracker reposting, so it does not mint a threat-actor
  assert.deepEqual(actors.map((a) => a.name).sort(), ["LockBit", "Team Insane PK"]);
  assert.deepEqual(actors.find((a) => a.name === "LockBit")?.threat_actor_types, ["crime-syndicate"]);
});

test("normalizeIoc refangs the conventional forms and refuses what is not its type", () => {
  assert.deepEqual(cited.normalizeIoc("domain", "evil[.]example[.]com"), { kind: "domain", value: "evil.example.com" });
  assert.deepEqual(cited.normalizeIoc("url", "hxxps://evil[.]example/x"), { kind: "url", value: "https://evil.example/x" });
  assert.deepEqual(cited.normalizeIoc("email", "a[@]evil[.]example"), { kind: "email", value: "a@evil.example" });
  assert.equal(cited.normalizeIoc("ip", "999.1.1.1"), null);
  assert.equal(cited.normalizeIoc("domain", "not a domain"), null);
  assert.equal(cited.normalizeIoc("md5", "z".repeat(32)), null);
  assert.equal(cited.normalizeIoc("mutex", "Global\\x"), null, "unknown types are dropped");
});

test("citedAt: extracted_at, else the ObjectId's second, else the publishing epoch — never now", () => {
  assert.equal(cited.citedAt({ extracted_at: "2026-10-01T08:00:00Z" }), "2026-10-01T08:00:00.000Z");
  assert.equal(cited.citedAt({ _id: "66f1a2b30000000000000000" }), new Date(0x66f1a2b3 * 1000).toISOString());
  assert.equal(cited.citedAt({}), "2026-09-07T00:00:00.000Z");
});
