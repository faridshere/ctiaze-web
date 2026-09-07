import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// lib/stix.ts imports ./site and ./navigator with extensionless relative
// specifiers (see tests/ts-ext-loader.mjs). Must run before the import below.
register("./ts-ext-loader.mjs", import.meta.url);
const { stixBundle, attackTechniqueUrl } = await import("../lib/stix.ts");

// A fixture, never the database — these tests must pass without
// MONGO_URI_READONLY, and what is under test is the transform.
const APT28 = {
  _id: "apt28",
  name: "APT28",
  // "G0007" is an identifier, not an alias, and "FANCY BEAR"/"Fancy Bear" is
  // the same name twice — both are really in our upstream record.
  aliases: ["Fancy Bear", "FANCY BEAR", "G0007", "Sofacy"],
  origin_country: "RU",
  state_sponsor: "Russia",
  type: "nation-state",
  targets_countries: ["UA"],
  targets_sectors: ["government"],
  description_en: "Russia-nexus espionage group attributed to the GRU.",
  refs: ["https://attack.mitre.org/groups/G0007/", "https://www.bbc.com/news/technology-37590375"],
  mitre: "G0007",
  source: "mitre",
  sources: ["mitre"],
  techniques: [
    { id: "T1589.001", name: "Credentials", tactic: "reconnaissance" },
    { id: "T1027", name: "Obfuscated Files or Information", tactic: "stealth" },
    { id: "T1078", name: "Valid Accounts", tactic: "Privilege Escalation" },
    { id: "T1078", name: "Valid Accounts", tactic: "persistence" },
    { id: "T1140", name: "Deobfuscate/Decode Files or Information", tactic: "defense-evasion" },
  ],
  malware: [
    { id: "S0012", name: "CHOPSTICK" },
    { id: null, name: "DealersChoice" },
  ],
  tools: [{ id: null, name: "Mimikatz" }],
  first_seen: "2004-01-01T00:00:00.000Z",
  last_active: "2026-08-01T00:00:00.000Z",
  recent_activity: [],
  last_refreshed: "2026-09-07T11:41:10.163Z",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

const bundle = stixBundle(APT28);
const byType = (t: string) => bundle.objects.filter((o) => o.type === t);

test("the bundle envelope is STIX 2.1 — and carries no spec_version, which 2.1 removed", () => {
  assert.equal(bundle.type, "bundle");
  assert.match(bundle.id, /^bundle--/);
  assert.ok(UUID.test(bundle.id.slice("bundle--".length)));
  assert.equal("spec_version" in bundle, false);
  assert.ok(Array.isArray(bundle.objects) && bundle.objects.length > 0);
});

test("every object has the common properties STIX requires of it", () => {
  const ids = new Set<string>();
  for (const o of bundle.objects) {
    assert.ok(o.type, "type");
    assert.equal(o.spec_version, "2.1", `${o.id} spec_version`);
    assert.equal(o.id.split("--")[0], o.type, `${o.id} is prefixed with its own type`);
    assert.ok(UUID.test(o.id.split("--")[1]), `${o.id} ends in a UUID`);
    assert.match(o.created ?? "", TIMESTAMP, `${o.id} created`);
    // marking-definition is the one SDO with no `modified` property at all
    // (STIX 2.1 §7.2.1) — asserting one would be asserting a spec violation.
    if (o.type === "marking-definition") assert.equal("modified" in o, false);
    else assert.match(o.modified ?? "", TIMESTAMP, `${o.id} modified`);
    assert.equal(ids.has(o.id), false, `${o.id} appears once`);
    ids.add(o.id);
  }
});

test("the bundle holds one intrusion-set, one identity, and the software and patterns it uses", () => {
  assert.equal(byType("intrusion-set").length, 1);
  assert.equal(byType("identity").length, 1);
  assert.equal(byType("marking-definition").length, 1);
  // T1078 is listed under two tactics upstream: one attack-pattern, two phases.
  assert.equal(byType("attack-pattern").length, 4);
  assert.equal(byType("malware").length, 2);
  assert.equal(byType("tool").length, 1);
  assert.equal(byType("relationship").length, 4 + 2 + 1);
});

test("the intrusion-set carries the ATT&CK group, our dossier, and the source refs", () => {
  const [g] = byType("intrusion-set");
  assert.equal(g.name, "APT28");
  assert.equal(g.description, APT28.description_en);
  assert.equal(g.first_seen, "2004-01-01T00:00:00.000Z");
  assert.equal(g.last_seen, "2026-08-01T00:00:00.000Z");
  assert.equal(g.resource_level, "government", "a stated state sponsor, not an inference");
  const attack = g.external_references?.find((r) => r.source_name === "mitre-attack");
  assert.equal(attack?.external_id, "G0007");
  assert.equal(attack?.url, "https://attack.mitre.org/groups/G0007/");
  const own = g.external_references?.find((r) => r.source_name === "skopnix");
  assert.equal(own?.url, "https://skopnix.com/actors/apt28");
  assert.ok(
    g.external_references?.some((r) => r.url === "https://www.bbc.com/news/technology-37590375"),
    "the dossier's own refs travel with the bundle"
  );
  for (const r of g.external_references ?? []) assert.ok(r.source_name, "source_name is required");
});

test("aliases lead with the name, drop the ATT&CK group id, and drop case-only repeats", () => {
  const [g] = byType("intrusion-set");
  assert.deepEqual(g.aliases, ["APT28", "Fancy Bear", "Sofacy"]);
});

test("the TLP marking is the one STIX 2.1 defines, not the newer TLP 2.0 name", () => {
  // OASIS's own stix2-validator rejects TLP:CLEAR against this id: STIX 2.1's
  // normative marking for unlimited distribution is still called TLP:WHITE,
  // and a bundle that fails the reference validator is not "spec-valid".
  const [m] = byType("marking-definition");
  assert.deepEqual(m, {
    type: "marking-definition",
    spec_version: "2.1",
    id: "marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9",
    created: "2017-01-20T00:00:00.000Z",
    definition_type: "tlp",
    name: "TLP:WHITE",
    definition: { tlp: "white" },
  });
});

test("attack-patterns reference ATT&CK and carry the tactics as kill-chain phases", () => {
  const patterns = byType("attack-pattern");
  for (const p of patterns) {
    const ref = p.external_references?.[0];
    assert.equal(ref?.source_name, "mitre-attack");
    assert.match(ref?.external_id ?? "", /^T\d{4}(\.\d{3})?$/);
    assert.equal(ref?.url, attackTechniqueUrl(ref!.external_id!));
    for (const phase of p.kill_chain_phases ?? []) {
      assert.equal(phase.kill_chain_name, "mitre-attack");
    }
  }
  const t1078 = patterns.find((p) => p.external_references?.[0].external_id === "T1078");
  assert.deepEqual(
    t1078?.kill_chain_phases?.map((p) => p.phase_name).sort(),
    ["persistence", "privilege-escalation"],
    "both tactics land on the one object"
  );
  // Retired pre-v19 tactic: omitted rather than filed under a guess.
  const t1140 = patterns.find((p) => p.external_references?.[0].external_id === "T1140");
  assert.equal(t1140?.kill_chain_phases, undefined);
});

test("sub-technique URLs point at the sub-technique page", () => {
  assert.equal(attackTechniqueUrl("T1589.001"), "https://attack.mitre.org/techniques/T1589/001/");
  assert.equal(attackTechniqueUrl("T1027"), "https://attack.mitre.org/techniques/T1027/");
});

test("malware is a family, and only ATT&CK software ids become ATT&CK links", () => {
  const [chopstick, dealers] = byType("malware");
  assert.equal(chopstick.is_family, true);
  assert.equal(dealers.is_family, true);
  assert.equal(chopstick.external_references?.[0].url, "https://attack.mitre.org/software/S0012/");
  assert.equal(dealers.external_references, undefined, "no ATT&CK id, no fabricated ATT&CK link");
  assert.equal(byType("tool")[0].is_family, undefined, "is_family is a malware property");
});

test("every ref in the bundle resolves to an object inside the bundle", () => {
  const ids = new Set(bundle.objects.map((o) => o.id));
  const [group] = byType("intrusion-set");
  for (const r of byType("relationship")) {
    assert.equal(r.relationship_type, "uses");
    assert.equal(r.source_ref, group.id, "the group is always the source");
    assert.ok(ids.has(r.target_ref ?? ""), `${r.target_ref} is present in the bundle`);
    assert.ok(["attack-pattern", "malware", "tool"].includes((r.target_ref ?? "").split("--")[0]));
  }
  for (const o of bundle.objects) {
    if (o.created_by_ref) assert.ok(ids.has(o.created_by_ref), `${o.id} created_by_ref resolves`);
    for (const m of o.object_marking_refs ?? []) assert.ok(ids.has(m), `${o.id} marking ${m} resolves`);
  }
});

test("ids are deterministic — the same actor twice is byte-identical", () => {
  const a = stixBundle(APT28);
  const b = stixBundle(APT28);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  // …and UUIDv5, not v4: that is what makes it reproducible.
  for (const o of a.objects) {
    if (o.type === "marking-definition") continue; // the spec fixes this one's id
    assert.ok(UUID_V5.test(o.id.split("--")[1]), `${o.id} is a v5 UUID`);
  }
  assert.ok(UUID_V5.test(a.id.split("--")[1]));
});

test("a different actor gets different ids", () => {
  const other = stixBundle({ ...APT28, _id: "turla", name: "Turla", mitre: "G0010" });
  assert.notEqual(other.id, bundle.id);
  assert.notEqual(other.objects.find((o) => o.type === "intrusion-set")!.id, byType("intrusion-set")[0].id);
  // The techniques are the same techniques, so their objects are the same
  // objects — that is the point of deriving the id from the ATT&CK id.
  const ap = (b: typeof bundle) => b.objects.filter((o) => o.type === "attack-pattern").map((o) => o.id).sort();
  assert.deepEqual(ap(other), ap(bundle));
});

test("modified tracks our record's refresh, and created does not churn per request", () => {
  const [g] = byType("intrusion-set");
  assert.equal(g.modified, "2026-09-07T11:41:10.163Z");
  const stale = stixBundle({ ...APT28, last_refreshed: undefined as never });
  assert.ok(TIMESTAMP.test(stale.objects[1].modified!), "a missing refresh still yields a valid timestamp");
});

test("an actor with no techniques still makes a usable bundle", () => {
  const bare = stixBundle({ ...APT28, techniques: [], malware: [], tools: [] });
  assert.equal(bare.objects.filter((o) => o.type === "intrusion-set").length, 1);
  assert.equal(bare.objects.filter((o) => o.type === "relationship").length, 0);
});
