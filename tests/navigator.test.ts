import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// lib/navigator.ts imports ./site with an extensionless relative specifier
// (see tests/ts-ext-loader.mjs for why Node's test runner needs a resolve hook
// for that). Must run before the dynamic import below.
register("./ts-ext-loader.mjs", import.meta.url);
const { navigatorLayer, navigatorTactic, NAVIGATOR_TACTICS } = await import("../lib/navigator.ts");

// A fixture, never the database: these tests must pass on a laptop with no
// MONGO_URI_READONLY, and the point is the transform, not the data.
const APT28 = {
  _id: "apt28",
  name: "APT28",
  aliases: ["Fancy Bear", "FANCY BEAR", "G0007", "Sofacy"],
  origin_country: "RU",
  state_sponsor: "Russia",
  type: "nation-state",
  targets_countries: ["UA", "DE"],
  targets_sectors: ["government", "defense"],
  description_en: "Russia-nexus espionage group attributed to the GRU.",
  refs: ["https://attack.mitre.org/groups/G0007/", "https://www.bbc.com/news/technology-37590375"],
  mitre: "G0007",
  source: "mitre",
  sources: ["mitre", "misp"],
  techniques: [
    { id: "T1589.001", name: "Credentials", tactic: "reconnaissance" },
    { id: "T1027", name: "Obfuscated Files or Information", tactic: "stealth" },
    { id: "T1562.001", name: "Disable or Modify Tools", tactic: "defense-impairment" },
    // The two cases the mapper exists for: a display-cased tactic, and the
    // retired pre-v19 name that cannot honestly be resolved to one of its
    // two successors.
    { id: "T1078", name: "Valid Accounts", tactic: "Privilege Escalation" },
    { id: "T1140", name: "Deobfuscate/Decode Files or Information", tactic: "defense-evasion" },
    // ATT&CK really does place one technique under two tactics.
    { id: "T1078", name: "Valid Accounts", tactic: "persistence" },
    // …and upstream really does repeat a row verbatim.
    { id: "T1027", name: "Obfuscated Files or Information", tactic: "stealth" },
  ],
  malware: [{ id: "S0012", name: "CHOPSTICK" }],
  tools: [{ id: null, name: "Mimikatz" }],
  recent_activity: [],
  last_refreshed: "2026-09-07T11:41:10.163Z",
};

const layerOf = (a: typeof APT28) => {
  const l = navigatorLayer(a);
  assert.ok(l, "a layer is built for an actor with techniques");
  return l!;
};

test("the layer carries every field Navigator requires to load it", () => {
  const l = layerOf(APT28);
  assert.equal(l.name, "APT28");
  assert.equal(l.domain, "enterprise-attack");
  assert.equal(l.versions.layer, "4.5");
  assert.ok(l.versions.navigator, "navigator version is required by the spec");
  assert.ok(l.versions.attack, "the knowledge-base version the techniques came from");
  assert.ok(Array.isArray(l.techniques) && l.techniques.length > 0);
  for (const t of l.techniques) {
    assert.match(t.techniqueID, /^T\d{4}(\.\d{3})?$/, `${t.techniqueID} is an ATT&CK technique id`);
    assert.equal(typeof t.score, "number");
    assert.equal(typeof t.comment, "string");
    assert.equal(t.enabled, true);
  }
});

test("the description says where the data came from and links back to the dossier", () => {
  const l = layerOf(APT28);
  assert.match(l.description, /MITRE ATT&CK G0007/);
  assert.match(l.description, /https:\/\/skopnix\.com\/actors\/apt28/);
  assert.equal(l.links[0].url, "https://skopnix.com/actors/apt28");
});

test("every emitted tactic is a real ATT&CK Enterprise shorthand", () => {
  const l = layerOf(APT28);
  for (const t of l.techniques) {
    if (t.tactic === undefined) continue;
    assert.ok(
      NAVIGATOR_TACTICS.includes(t.tactic),
      `"${t.tactic}" on ${t.techniqueID} is not a Navigator tactic shorthand`
    );
  }
});

test("a display-cased tactic is normalised; the retired defense-evasion is not guessed", () => {
  const l = layerOf(APT28);
  const byId = (id: string) => l.techniques.filter((t) => t.techniqueID === id);
  assert.ok(
    byId("T1078").some((t) => t.tactic === "privilege-escalation"),
    '"Privilege Escalation" normalises to the shorthand'
  );
  // v19 split Defense Evasion into Stealth and Defense Impairment. Picking one
  // would file the technique under a tactic MITRE never assigned it; omitting
  // `tactic` annotates it wherever ATT&CK actually places it.
  const t1140 = byId("T1140");
  assert.equal(t1140.length, 1);
  assert.equal(t1140[0].tactic, undefined);
  assert.match(t1140[0].comment, /not an ATT&CK 19 Enterprise tactic/);
});

test("a technique in two tactics is annotated twice; a verbatim repeat is not", () => {
  const l = layerOf(APT28);
  assert.deepEqual(
    l.techniques.filter((t) => t.techniqueID === "T1078").map((t) => t.tactic).sort(),
    ["persistence", "privilege-escalation"]
  );
  assert.equal(l.techniques.filter((t) => t.techniqueID === "T1027").length, 1);
  const pairs = l.techniques.map((t) => `${t.techniqueID}|${t.tactic ?? ""}`);
  assert.equal(new Set(pairs).size, pairs.length, "no duplicate (technique, tactic) cell");
});

test("the score is flat and inside the gradient — a coverage map, not a ranking", () => {
  const l = layerOf(APT28);
  const scores = new Set(l.techniques.map((t) => t.score));
  assert.equal(scores.size, 1, "one score for every technique");
  const [score] = [...scores];
  assert.ok(score >= l.gradient.minValue && score <= l.gradient.maxValue);
  assert.ok(l.gradient.colors.length >= 2, "the format wants a gradient even when nothing varies");
  assert.equal(l.legendItems.length, 1);
  assert.match(l.description, /coverage map, not a ranking/);
});

test("sub-technique annotations are expanded, or the matrix opens looking empty", () => {
  const l = layerOf(APT28);
  assert.equal(l.layout.expandedSubtechniques, "annotated");
  assert.equal(l.layout.layout, "side");
  assert.equal(l.hideDisabled, false);
});

test("an actor with no techniques gets no layer at all", () => {
  assert.equal(navigatorLayer({ ...APT28, techniques: [] }), null);
  assert.equal(navigatorLayer({ ...APT28, techniques: undefined as never }), null);
});

test("navigatorTactic accepts the 15 real tactics and rejects everything else", () => {
  assert.equal(NAVIGATOR_TACTICS.length, 15);
  for (const t of NAVIGATOR_TACTICS) assert.equal(navigatorTactic(t), t);
  assert.equal(navigatorTactic("Command and Control"), "command-and-control");
  assert.equal(navigatorTactic("  DEFENSE IMPAIRMENT  "), "defense-impairment");
  assert.equal(navigatorTactic("defense-evasion"), null, "retired in ATT&CK v19");
  assert.equal(navigatorTactic("lateral movement!!"), "lateral-movement");
  assert.equal(navigatorTactic("not-a-tactic"), null);
  assert.equal(navigatorTactic(null), null);
  assert.equal(navigatorTactic(""), null);
});
