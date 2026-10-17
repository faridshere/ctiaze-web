import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

// lib/stack/* imports its siblings without extensions (bundler resolution);
// the loader maps them to .ts for node's own resolver.
register("./ts-ext-loader.mjs", import.meta.url);

const { cmpVersion, evalRanges } = await import("../lib/stack/version.ts");
const { parsePurl, parseCpe23, cpeName } = await import("../lib/stack/ids.ts");
const { parseLine, parsePaste, parseSbom, parseApiBody, MAX_COMPONENTS } = await import("../lib/stack/parse.ts");
const { resolveComponent } = await import("../lib/stack/resolve.ts");
const { assessComponent, actorClaims, mergeClaims, kevByName, cpeMatchesOf, confidenceOf, matchesFor, combinePulls } = await import("../lib/stack/match.ts");

type KevEntry = import("../lib/stack/match.ts").KevEntry;
type CveFacts = import("../lib/stack/match.ts").CveFacts;
type ProductCve = import("../lib/stack/types.ts").ProductCve;

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/stack/${name}`, import.meta.url), "utf8"));

// Real records: NVD 2.0 CVE-2021-44228 / CVE-2021-41773 (apache rows) and CISA KEV rows.
const NVD: ProductCve[] = fixture("nvd-apache.json").vulnerabilities.map((v: { cve: { id: string } }) => ({
  id: v.cve.id,
  matches: cpeMatchesOf(v.cve),
}));
const KEV: KevEntry[] = fixture("kev-sample.json").vulnerabilities.map(
  (v: { cveID: string; vendorProject: string; product: string; dateAdded: string; knownRansomwareCampaignUse: string }) => ({
    cve: v.cveID,
    vendor: v.vendorProject,
    product: v.product,
    dateAdded: v.dateAdded,
    ransomware: v.knownRansomwareCampaignUse === "Known",
  }),
);
const KEV_MAP = new Map(KEV.map((k) => [k.cve, k]));
const KEV_NAMES = KEV.map((k) => ({ vendor: k.vendor, product: k.product }));

function facts(over: Partial<CveFacts> = {}): CveFacts {
  return { kev: KEV_MAP, epss: new Map(), priority: new Map(), actors: new Map(), ...over };
}

// ---- versions ---------------------------------------------------------------

test("cmpVersion orders numerically and refuses to guess across digit/letter segments", () => {
  assert.equal(cmpVersion("2.14.1", "2.15.0"), -1);
  assert.equal(cmpVersion("2.10.0", "2.9.9"), 1);
  assert.equal(cmpVersion("v1.2.3", "1.2.3"), 0);
  assert.equal(cmpVersion("2.4", "2.4.0"), 0);
  assert.equal(cmpVersion("8.2p1", "8.2.1"), null);
  assert.equal(cmpVersion("", "1"), null);
});

const log4shell = NVD.find((c) => c.id === "CVE-2021-44228")!.matches;

test("Log4Shell ranges: 2.14.1 in range with the fix of its own branch, 2.17.1 and 2.12.2 not", () => {
  const hit = evalRanges("2.14.1", log4shell);
  assert.equal(hit.verdict, "in-range");
  assert.equal(hit.fixedIn, "2.15.0");
  assert.match(hit.detail!, /2\.14\.1 ∈ \[2\.13\.0, 2\.15\.0\)/);
  assert.equal(evalRanges("2.17.1", log4shell).verdict, "not-affected");
  assert.equal(evalRanges("2.12.2", log4shell).verdict, "not-affected");
  // the 2.4–2.12.2 branch: the fix named is that branch's, never a downgrade
  assert.equal(evalRanges("2.8.0", log4shell).fixedIn, "2.12.2");
  assert.equal(evalRanges("2.0", log4shell).verdict, "in-range");
});

test("an inclusive upper bound never borrows another branch's fix", () => {
  // Shape seen live on a FortiOS CVE: 7.0.0–7.0.18 inclusive, plus a 7.4 branch fixed in 7.4.11.
  const r = evalRanges("7.0.1", [
    { criteria: "cpe:2.3:o:fortinet:fortios:*:*:*:*:*:*:*:*", vulnerable: true, versionStartIncluding: "7.0.0", versionEndIncluding: "7.0.18" },
    { criteria: "cpe:2.3:o:fortinet:fortios:*:*:*:*:*:*:*:*", vulnerable: true, versionStartIncluding: "7.4.0", versionEndExcluding: "7.4.11" },
  ]);
  assert.equal(r.verdict, "in-range");
  assert.equal(r.fixedIn, null);
});

test("evalRanges: no version, no vulnerable rows, wildcard without bounds, uncomparable bounds", () => {
  assert.equal(evalRanges(null, log4shell).verdict, "no-version");
  assert.equal(evalRanges("1.0", [{ criteria: "cpe:2.3:o:x:y:-:*:*:*:*:*:*:*", vulnerable: false }]).verdict, "not-checked");
  assert.equal(evalRanges("1.0", [{ criteria: "cpe:2.3:a:x:y:*:*:*:*:*:*:*:*", vulnerable: true }]).verdict, "ambiguous");
  assert.equal(
    evalRanges("9.6p1", [{ criteria: "cpe:2.3:a:openbsd:openssh:*:*:*:*:*:*:*:*", versionEndExcluding: "9.6.1" }]).verdict,
    "ambiguous",
  );
  const exact = NVD.find((c) => c.id === "CVE-2021-41773")!.matches;
  assert.equal(evalRanges("2.4.49", exact).verdict, "in-range");
  assert.equal(evalRanges("2.4.50", exact).verdict, "not-affected");
});

// ---- identifiers & parsing --------------------------------------------------

test("parsePurl and parseCpe23 follow the public specs", () => {
  assert.deepEqual(parsePurl("pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1?type=jar"), {
    type: "maven",
    namespace: "org.apache.logging.log4j",
    name: "log4j-core",
    version: "2.14.1",
  });
  assert.deepEqual(parsePurl("pkg:npm/%40angular/core@16.0.0"), { type: "npm", namespace: "@angular", name: "core", version: "16.0.0" });
  assert.equal(parsePurl("npm/lodash"), null);
  assert.deepEqual(parseCpe23("cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*"), {
    part: "a",
    vendor: "apache",
    product: "http_server",
    version: "2.4.49",
  });
  assert.equal(parseCpe23("cpe:2.3:a:veeam:backup\\:and_replication:*")?.product, "backup:and_replication");
  assert.equal(parseCpe23("cpe:/a:apache:http_server:2.4.49"), null);
});

test("parseLine accepts 'vendor product version' and the shapes people actually paste", () => {
  assert.deepEqual(parseLine("apache http_server 2.4.49"), { name: "http_server", version: "2.4.49", vendor: "apache", origin: "paste" });
  assert.deepEqual(parseLine("log4j 2.14.1"), { name: "log4j", version: "2.14.1", vendor: null, origin: "paste" });
  assert.deepEqual(parseLine("microsoft exchange server 2019"), { name: "exchange server", version: "2019", vendor: "microsoft", origin: "paste" });
  assert.deepEqual(parseLine("nginx/1.25.3"), { name: "nginx", version: "1.25.3", vendor: null, origin: "paste" });
  assert.equal(parseLine("openssh@v9.6p1")?.version, "9.6p1");
  assert.equal(parseLine("jenkins")?.version, null);
  assert.equal(parseLine("   # a comment"), null);
  assert.equal(parseLine("pkg:npm/lodash@4.17.20")?.purl, "pkg:npm/lodash@4.17.20");
  assert.equal(parseLine("cpe:2.3:o:fortinet:fortios:7.2.4:*:*:*:*:*:*:*")?.vendor, "fortinet");
  assert.equal(parsePaste("log4j 2.14.1\nLOG4J 2.14.1\n\nnginx 1.25.3").length, 2);
});

test("parseSbom reads CycloneDX (nested components, metadata) and dedupes", () => {
  const r = parseSbom(fixture("cyclonedx.json"));
  assert.equal(r.format, "cyclonedx");
  assert.deepEqual(
    r.components.map((c) => `${c.name}@${c.version}`),
    ["shop-backend@3.2.0", "log4j-core@2.14.1", "log4j-api@2.14.1", "http_server@2.4.49", "left-pad@1.3.0"],
  );
  // the group is kept as the namespace; the vendor is what it implies, never the raw groupId
  assert.equal(r.components[1].namespace, "org.apache.logging.log4j");
  assert.equal(r.components[1].vendor, "apache");
  assert.equal(r.components[3].cpe, "cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*");
});

test("parseSbom reads SPDX packages, external refs, suppliers and NOASSERTION", () => {
  const r = parseSbom(fixture("spdx.json"));
  assert.equal(r.format, "spdx");
  const [openssl, activemq, mystery] = r.components;
  assert.equal(openssl.cpe, "cpe:2.3:a:openssl:openssl:3.0.7:*:*:*:*:*:*:*");
  assert.equal(openssl.purl, "pkg:deb/debian/openssl@3.0.7?arch=amd64");
  assert.equal(openssl.vendor, "OpenSSL Software Foundation");
  assert.equal(activemq.vendor, null);
  assert.equal(mystery.version, null);
  assert.throws(() => parseSbom({ hello: 1 }), /Neither CycloneDX/);
  assert.throws(() => parseSbom("x"), /Not a JSON object/);
});

test("parseApiBody validates shape and the 500-component cap", () => {
  assert.equal(parseApiBody(null).ok, false);
  assert.equal(parseApiBody({ components: [] }).ok, false);
  const big = { components: Array.from({ length: MAX_COMPONENTS + 1 }, (_, i) => ({ name: `p${i}`, version: "1" })) };
  const tooBig = parseApiBody(big);
  assert.equal(tooBig.ok, false);
  assert.match(!tooBig.ok ? tooBig.error : "", /At most 500/);
  const fromPurl = parseApiBody({ components: [{ purl: "pkg:pypi/django@3.2.0" }] });
  assert.ok(fromPurl.ok && fromPurl.components[0].name === "django" && fromPurl.components[0].version === "3.2.0");
  const bad = parseApiBody({ components: [{ version: "1.0" }] });
  assert.equal(bad.ok, false);
});

// ---- resolution -------------------------------------------------------------

test("resolveComponent: cpe > purl > alias > KEV dictionary > name guess", () => {
  assert.deepEqual(resolveComponent({ name: "x", version: "1", cpe: "cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*" }), {
    vendor: "apache",
    product: "http_server",
    part: "a",
    via: "cpe",
  });
  assert.equal(resolveComponent({ name: "log4j-core", version: "2.14.1", purl: "pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1" })?.via, "purl");
  const alias = resolveComponent({ name: "http_server", version: "2.4.49", vendor: "apache" });
  assert.equal(alias?.via, "alias");
  assert.equal(alias?.product, "http_server");
  const nginx = resolveComponent({ name: "nginx", version: "1.25.3" });
  assert.deepEqual([nginx?.vendor, nginx?.alts?.[0]?.vendor], ["f5", "nginx"]);
  // The alias table wins over the KEV dictionary when both know the name.
  const forti = resolveComponent({ name: "FortiOS", version: "7.0.1", vendor: "Fortinet" }, KEV_NAMES);
  assert.deepEqual([forti?.via, forti?.part], ["alias", "o"]);
  // A name only the KEV catalog knows goes through the dictionary.
  const viaKev = resolveComponent({ name: "Widget Portal", version: "1.0" }, [{ vendor: "Acme", product: "Widget Portal" }]);
  assert.deepEqual(viaKev, { vendor: "acme", product: "widget_portal", via: "kev" });
  const guess = resolveComponent({ name: "left-pad", version: "1.3.0", purl: "pkg:npm/left-pad@1.3.0" });
  assert.deepEqual(guess, { vendor: "left_pad", product: "left_pad", via: "name" });
});

// ---- assessment -------------------------------------------------------------

test("log4j 2.14.1 via purl: Log4Shell in range, KEV, high confidence, fix 2.15.0", () => {
  const c = { name: "log4j-core", version: "2.14.1", purl: "pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1" };
  const r = resolveComponent(c, KEV_NAMES)!;
  const res = assessComponent(c, r, { status: "ok", cves: NVD }, kevByName(r, c, KEV), facts({ epss: new Map([["CVE-2021-44228", 0.944]]) }));
  assert.equal(res.status, "checked");
  assert.equal(res.findings.length, 1);
  const f = res.findings[0];
  assert.equal(f.cve, "CVE-2021-44228");
  assert.equal(f.kev, true);
  assert.equal(f.ransomware, true);
  assert.equal(f.kev_date_added, "2021-12-10");
  assert.equal(f.epss, 0.944);
  assert.equal(f.version, "in-range");
  assert.equal(f.confidence, "high");
  assert.equal(f.fixed_in, "2.15.0");
});

test("log4j 2.17.1: NVD ranges exclude it, so the KEV name match is NOT reported", () => {
  const c = { name: "log4j", version: "2.17.1" };
  const r = resolveComponent(c, KEV_NAMES)!;
  const named = kevByName(r, c, KEV);
  assert.deepEqual(named.map((k) => k.cve), ["CVE-2021-44228"]); // Log4j2 ≡ log4j
  const res = assessComponent(c, r, { status: "ok", cves: NVD }, named, facts());
  assert.equal(res.findings.length, 0);
  assert.equal(res.not_affected, 1);
  assert.equal(res.status, "checked");
});

test("NVD over budget: KEV name matches still listed, version not checked, medium confidence", () => {
  const c = { name: "http_server", version: "2.4.49", vendor: "apache" };
  const r = resolveComponent(c, KEV_NAMES)!;
  const res = assessComponent(c, r, { status: "skipped" }, kevByName(r, c, KEV), facts());
  assert.equal(res.status, "kev-only");
  assert.deepEqual(res.findings.map((f) => f.cve).sort(), ["CVE-2021-41773", "CVE-2021-42013"]);
  assert.ok(res.findings.every((f) => f.version === "not-checked" && f.confidence === "medium"));
  assert.match(res.note!, /budget/);
});

test("NVD error is reported as an error, never as 'nothing found'", () => {
  const c = { name: "jenkins", version: "2.400" };
  const r = resolveComponent(c, KEV_NAMES)!;
  const res = assessComponent(c, r, { status: "error" }, [], facts());
  assert.equal(res.status, "upstream-error");
  assert.match(res.note!, /did not answer/);
});

test("unresolved and no-records components say so", () => {
  const c = { name: "left-pad", version: "1.3.0", purl: "pkg:npm/left-pad@1.3.0" };
  assert.equal(assessComponent(c, null, { status: "ok", cves: [] }, [], facts()).status, "unresolved");
  const r = resolveComponent(c, KEV_NAMES)!;
  const res = assessComponent(c, r, { status: "ok", cves: [] }, [], facts());
  assert.equal(res.status, "no-records");
  assert.match(res.note!, /left_pad:left_pad/);
});

test("a product listed only as a platform (vulnerable:false) is not reported", () => {
  const c = { name: "fortios", version: "7.0.1" };
  const r = resolveComponent(c)!;
  const cves: ProductCve[] = [{ id: "CVE-2099-0001", matches: [{ criteria: "cpe:2.3:o:fortinet:fortios:-:*:*:*:*:*:*:*", vulnerable: false }] }];
  assert.equal(assessComponent(c, r, { status: "ok", cves }, [], facts()).findings.length, 0);
});

test("a name guess is low confidence unless the version is in range (then medium)", () => {
  assert.equal(confidenceOf("name", "not-checked"), "low");
  assert.equal(confidenceOf("name", "in-range"), "medium");
  assert.equal(confidenceOf("kev", "in-range"), "high");
  assert.equal(confidenceOf("cpe", "ambiguous"), "medium");
});

test("kevByName: a vendor-less free-text name matches on product; a stated wrong vendor does not", () => {
  const kev: KevEntry[] = [{ cve: "CVE-1", vendor: "Jenkins", product: "Jenkins", dateAdded: null, ransomware: false }];
  const c1 = { name: "jenkins", version: "2.1" };
  assert.equal(kevByName(resolveComponent(c1)!, c1, kev).length, 1);
  const c2 = { name: "gizmo", version: "1", vendor: "acme" };
  const kev2: KevEntry[] = [{ cve: "CVE-2", vendor: "Other", product: "Gizmo", dateAdded: null, ransomware: false }];
  assert.equal(kevByName(resolveComponent(c2)!, c2, kev2).length, 0);
});

// ---- actor evidence ---------------------------------------------------------

test("actorClaims drops rows without an evidence quote or without any source, keeps http(s) links only", () => {
  const wanted = new Set(["CVE-2021-44228", "CVE-2023-46604"]);
  const m = actorClaims(
    "apt-x",
    "APT X",
    [
      { cve: "cve-2021-44228", evidence: "APT X exploited Log4Shell against VMware Horizon.", source: "CISA", url: "https://www.cisa.gov/a", date: "2022-01-05T00:00:00Z", item: "i1" },
      { cve: "CVE-2021-44228", evidence: "   ", source: "CISA", url: "https://www.cisa.gov/b" },
      { cve: "CVE-2021-44228", evidence: "Quote with no source at all." },
      { cve: "CVE-2023-46604", evidence: "Exploited ActiveMQ.", url: "javascript:alert(1)" },
      { cve: "CVE-2023-46604", evidence: "Exploited ActiveMQ for HelloKitty.", url: "https://example.org/report" },
      { cve: "CVE-1999-0001", evidence: "Not asked for.", source: "x" },
    ],
    wanted,
  );
  assert.equal(m.get("CVE-2021-44228")?.length, 1);
  assert.deepEqual(m.get("CVE-2021-44228")?.[0], {
    actor_id: "apt-x",
    actor: "APT X",
    evidence: "APT X exploited Log4Shell against VMware Horizon.",
    source: "CISA",
    url: "https://www.cisa.gov/a",
    date: "2022-01-05",
    item: "i1",
  });
  const amq = m.get("CVE-2023-46604")!;
  assert.equal(amq.length, 1);
  assert.equal(amq[0].source, "example.org");
  assert.equal(m.has("CVE-1999-0001"), false);
  const merged = mergeClaims([m, actorClaims("b", "B", [{ cve: "CVE-2021-44228", evidence: "B too.", source: "Mandiant" }], wanted)]);
  assert.equal(merged.get("CVE-2021-44228")?.length, 2);
});

test("findings rank KEV and cited-actor CVEs first", () => {
  const c = { name: "log4j", version: "2.14.1" };
  const r = resolveComponent(c)!;
  const cves: ProductCve[] = [
    ...NVD,
    { id: "CVE-2099-0002", matches: [{ criteria: "cpe:2.3:a:apache:log4j:*:*:*:*:*:*:*:*", versionEndExcluding: "3.0" }] },
  ];
  const actors = new Map([["CVE-2021-44228", [{ actor_id: "a", actor: "A", evidence: "e", source: "s", url: null, date: null, item: null }]]]);
  const res = assessComponent(c, r, { status: "ok", cves }, [], facts({ actors, epss: new Map([["CVE-2099-0002", 0.99]]) }));
  assert.deepEqual(res.findings.map((f) => f.cve), ["CVE-2021-44228", "CVE-2099-0002"]);
  assert.equal(res.findings[0].actors[0].actor, "A");
});

// ---- review fixes (PR #13) ----------------------------------------------------

test("#1 cmpVersion: missing segments are 0, pre-releases sort before the release", () => {
  assert.equal(cmpVersion("2.17", "2.17.0"), 0);
  assert.equal(cmpVersion("2.17.0", "2.17"), 0);
  assert.equal(cmpVersion("2.17", "2.17.1"), -1);
  assert.equal(cmpVersion("2.15.0-rc1", "2.15.0"), -1);
  assert.equal(cmpVersion("2.15.0", "2.15.0-rc1"), 1);
  assert.equal(cmpVersion("2.15.0-alpha1", "2.15.0-beta1"), -1);
  assert.equal(cmpVersion("2.15.0-beta2", "2.15.0-rc1"), -1);
  assert.equal(cmpVersion("2.15.0-rc1", "2.15.0-rc2"), -1);
  assert.equal(cmpVersion("2.15.0.rc1", "2.14.9"), 1);
  // a post-release letter (OpenSSL 1.1.1a, OpenSSH 8.2p1) still sorts after the release
  assert.equal(cmpVersion("1.1.1a", "1.1.1"), 1);
  assert.equal(cmpVersion("8.2p1", "8.2"), 1);
  assert.equal(cmpVersion("8.2p1", "8.2.1"), null);
  // log4j 2.17 against CVE-2021-45105's "fixed in 2.17.0" is the fixed release
  const cve45105 = [{ criteria: "cpe:2.3:a:apache:log4j:*:*:*:*:*:*:*:*", vulnerable: true, versionStartIncluding: "2.13.0", versionEndExcluding: "2.17.0" }];
  assert.equal(evalRanges("2.17", cve45105).verdict, "not-affected");
  // and a 2.15.0 pre-release is still inside Log4Shell's [2.13.0, 2.15.0)
  assert.equal(evalRanges("2.15.0-rc1", log4shell).verdict, "in-range");
});

test("#4 exact-version rows compare version and CPE update together", () => {
  // OpenSSH 7.2p2 is filed as version 7.2, update p2
  const ssh = [{ criteria: "cpe:2.3:a:openbsd:openssh:7.2:p2:*:*:*:*:*:*", vulnerable: true }];
  assert.equal(evalRanges("7.2p2", ssh).verdict, "in-range");
  assert.equal(evalRanges("7.2p1", ssh).verdict, "not-affected");
  assert.equal(evalRanges("7.2", ssh).verdict, "not-affected");
  // a beta-only log4j row does not flag the 2.0 release
  const beta = [{ criteria: "cpe:2.3:a:apache:log4j:2.0:beta9:*:*:*:*:*:*", vulnerable: true }];
  assert.equal(evalRanges("2.0", beta).verdict, "not-affected");
  assert.equal(evalRanges("2.0-beta9", beta).verdict, "in-range");
  // update "-" is the plain release; update "*" is any update of that version
  assert.equal(evalRanges("2.0", [{ criteria: "cpe:2.3:a:apache:log4j:2.0:-:*:*:*:*:*:*", vulnerable: true }]).verdict, "in-range");
  assert.equal(evalRanges("2.0-beta9", [{ criteria: "cpe:2.3:a:apache:log4j:2.0:-:*:*:*:*:*:*", vulnerable: true }]).verdict, "not-affected");
  assert.equal(evalRanges("7.2p2", [{ criteria: "cpe:2.3:a:openbsd:openssh:7.2:*:*:*:*:*:*:*", vulnerable: true }]).verdict, "in-range");
  // the real Log4Shell rows: 2.0 (the release row) in range, a beta listed by its own row
  assert.equal(evalRanges("2.0-beta9", log4shell).verdict, "in-range");
});

test("#3 escaped CPE characters: a product matches its own NVD rows, and the NVD query is escaped", () => {
  // Veeam Backup & Replication, as NVD files it (CVE-2024-40711; the unescaped name is a 404 at NVD)
  const row = { criteria: "cpe:2.3:a:veeam:veeam_backup_\\&_replication:*:*:*:*:*:*:*:*", vulnerable: true, versionEndExcluding: "12.2.0.334" };
  const c = { name: "x", version: "12.1.1.56", cpe: "cpe:2.3:a:veeam:veeam_backup_\\&_replication:12.1.1.56:*:*:*:*:*:*:*" };
  const r = resolveComponent(c)!;
  assert.equal(r.product, "veeam_backup_&_replication");
  assert.equal(matchesFor([row], r.vendor, r.product).length, 1);
  const res = assessComponent(c, r, { status: "ok", cves: [{ id: "CVE-2024-40711", matches: [row] }] }, [], facts());
  assert.equal(res.findings.length, 1);
  assert.equal(res.findings[0].version, "in-range");
  assert.equal(cpeName("a", r.vendor, r.product), "cpe:2.3:a:veeam:veeam_backup_\\&_replication");
  assert.equal(cpeName("o", "paloaltonetworks", "pan-os"), "cpe:2.3:o:paloaltonetworks:pan-os");
  assert.equal(cpeName("a", "nodejs", "node.js"), "cpe:2.3:a:nodejs:node.js");
  // an escaped colon inside a product name does not shift the vendor/product fields
  assert.equal(matchesFor([{ criteria: "cpe:2.3:a:acme:a\\:b:*:*:*:*:*:*:*:*" }], "acme", "a:b").length, 1);
});

// Apache OFBiz as CISA KEV lists it (CVE-2024-38856, CVE-2024-32113, CVE-2020-9496)
const OFBIZ_KEV: KevEntry[] = ["CVE-2024-38856", "CVE-2024-32113", "CVE-2020-9496"].map((cve) => ({ cve, vendor: "Apache", product: "OFBiz", dateAdded: null, ransomware: false }));
const OFBIZ_NAMES = [...KEV_NAMES, { vendor: "Apache", product: "OFBiz" }];

test("#5 a CycloneDX group is a namespace, not the vendor: an OFBiz SBOM finds what pasting 'ofbiz 18.12' finds", () => {
  const sbom = parseSbom({
    bomFormat: "CycloneDX",
    components: [
      { group: "org.apache.ofbiz", name: "ofbiz", version: "18.12.10", purl: "pkg:maven/org.apache.ofbiz/ofbiz@18.12.10" },
      { group: "org.apache.ofbiz", name: "ofbiz-framework", version: "18.12.10" },
    ],
  });
  const [withPurl, noPurl] = sbom.components;
  assert.equal(withPurl.namespace, "org.apache.ofbiz");
  assert.equal(withPurl.vendor, "apache");
  assert.equal(noPurl.vendor, "apache");
  const pasted = parseLine("ofbiz 18.12")!;
  const want = kevByName(resolveComponent(pasted, OFBIZ_NAMES)!, pasted, OFBIZ_KEV).map((k) => k.cve).sort();
  assert.equal(want.length, 3);
  const r = resolveComponent(withPurl, OFBIZ_NAMES)!;
  assert.deepEqual([r.vendor, r.product], ["apache", "ofbiz"]);
  assert.deepEqual(kevByName(r, withPurl, OFBIZ_KEV).map((k) => k.cve).sort(), want);
  // an API caller who sends the raw groupId as the vendor gets the same answer
  const api = { name: "ofbiz", version: "18.12.10", vendor: "org.apache.ofbiz" };
  assert.deepEqual(kevByName(resolveComponent(api, OFBIZ_NAMES)!, api, OFBIZ_KEV).map((k) => k.cve).sort(), want);
  // the SBOM row carries its namespace through the API
  const body = parseApiBody({ components: [{ name: "ofbiz", version: "18.12.10", namespace: "org.apache.ofbiz", origin: "sbom" }] });
  assert.ok(body.ok && body.components[0].namespace === "org.apache.ofbiz" && body.components[0].origin === "sbom");
});

test("#2 a library named after a server product is not that product; word aliases are for free-text paste only", () => {
  const boot = { name: "spring-boot-starter-log4j2", version: "2.6.1", namespace: "org.springframework.boot", purl: "pkg:maven/org.springframework.boot/spring-boot-starter-log4j2@2.6.1", origin: "sbom" as const };
  const rb = resolveComponent(boot, KEV_NAMES);
  assert.notEqual(rb?.product, "log4j");
  const res = assessComponent(boot, rb, { status: "ok", cves: NVD }, rb ? kevByName(rb, boot, KEV) : [], facts());
  assert.equal(res.findings.some((f) => f.cve === "CVE-2021-44228"), false);
  // the same starter without a purl, as a CycloneDX row with only its group
  const bootNoPurl = { name: "spring-boot-starter-log4j2", version: "2.6.1", namespace: "org.springframework.boot", origin: "sbom" as const };
  assert.notEqual(resolveComponent(bootNoPurl, KEV_NAMES)?.product, "log4j");
  // the npm redis client and the openssl-sys crate are not the Redis server / OpenSSL
  const redis = resolveComponent({ name: "redis", version: "4.6.0", purl: "pkg:npm/redis@4.6.0", origin: "sbom" }, KEV_NAMES);
  assert.ok(!redis || (redis.via === "name" && redis.vendor !== "redis"), JSON.stringify(redis));
  const sys = resolveComponent({ name: "openssl-sys", version: "0.9.80", purl: "pkg:cargo/openssl-sys@0.9.80", origin: "sbom" }, KEV_NAMES);
  assert.ok(!sys || sys.product !== "openssl", JSON.stringify(sys));
  // a structured SBOM name is matched whole, never word by word
  assert.notEqual(resolveComponent({ name: "php-redis-session", version: "1.0", origin: "sbom" })?.product, "php");
  // what still resolves: curated purls, distro packages named after upstream, groupIds of the product's own vendor, and paste words
  assert.equal(resolveComponent({ name: "log4j-core", version: "2.14.1", namespace: "org.apache.logging.log4j", origin: "sbom" })?.product, "log4j");
  assert.equal(resolveComponent({ name: "openssh-server", version: "9.6p1", purl: "pkg:deb/debian/openssh-server@9.6p1", origin: "sbom" })?.product, "openssh");
  assert.equal(resolveComponent({ name: "redis", version: "7.0.1", purl: "pkg:deb/debian/redis@7.0.1", origin: "sbom" })?.product, "redis");
  assert.equal(resolveComponent({ name: "tomcat", version: "9.0.1", purl: "pkg:maven/org.apache.tomcat/tomcat@9.0.1", origin: "sbom" })?.product, "tomcat");
  assert.equal(resolveComponent(parseLine("apache-tomcat 9.0.1")!)?.product, "tomcat");
});

test("#6 status says whether versions were evaluated: KEV-by-name hits with zero NVD records are kev-only, not checked", () => {
  const c = { name: "http_server", version: "2.4.49", vendor: "apache" };
  const r = resolveComponent(c, KEV_NAMES)!;
  const named = kevByName(r, c, KEV);
  // NVD answered with nothing under this name
  const empty = assessComponent(c, r, { status: "ok", cves: [] }, named, facts());
  assert.equal(empty.status, "kev-only");
  assert.match(empty.note!, /versions not checked/);
  assert.ok(empty.findings.every((f) => f.version === "not-checked"));
  // NVD answered with records that only name other products
  const others = assessComponent(c, r, { status: "ok", cves: NVD.filter((x) => x.id === "CVE-2021-44228") }, named, facts());
  assert.equal(others.status, "kev-only");
  // evaluated, but a KEV name match NVD does not list under this product is called out
  const mixed = assessComponent(c, r, { status: "ok", cves: NVD.filter((x) => x.id === "CVE-2021-41773") }, named, facts());
  assert.equal(mixed.status, "checked");
  assert.match(mixed.note!, /1 CISA KEV name match.*not checked/);
});

test("#7 per-name NVD outcomes: a cut or failed alt name is a partial check, and a failed alt never discards the primary", () => {
  const ok = { cves: NVD };
  assert.deepEqual(combinePulls([{ name: "f5:nginx", result: ok }]), { status: "ok", cves: NVD });
  const cut = combinePulls([{ name: "f5:nginx", result: ok }, { name: "nginx:nginx", result: "skipped" }]);
  assert.equal(cut.status, "partial");
  const failed = combinePulls([{ name: "f5:nginx", result: ok }, { name: "nginx:nginx", result: "error" }]);
  assert.equal(failed.status, "partial");
  assert.equal(failed.status === "partial" && failed.cves.length, NVD.length);
  assert.deepEqual(combinePulls([{ name: "a:b", result: "error" }, { name: "c:d", result: "skipped" }]), { status: "error" });
  assert.deepEqual(combinePulls([{ name: "a:b", result: "skipped" }, { name: "c:d", result: "skipped" }]), { status: "skipped" });
  // the same CVE from two names merges its rows
  const merged = combinePulls([
    { name: "a:x", result: { cves: [{ id: "CVE-1", matches: [{ criteria: "cpe:2.3:a:a:x:1:*:*:*:*:*:*:*" }] }] } },
    { name: "b:x", result: { cves: [{ id: "CVE-1", matches: [{ criteria: "cpe:2.3:a:b:x:1:*:*:*:*:*:*:*" }] }] } },
  ]);
  assert.equal(merged.status === "ok" && merged.cves[0].matches.length, 2);

  const c = { name: "log4j", version: "2.14.1" };
  const r = resolveComponent(c)!;
  const res = assessComponent(c, r, cut, [], facts());
  assert.equal(res.status, "partial");
  assert.match(res.note!, /nginx:nginx/);
  assert.equal(res.findings[0].cve, "CVE-2021-44228");
  const res2 = assessComponent(c, r, failed, [], facts());
  assert.equal(res2.status, "partial");
  assert.equal(res2.findings.length, 1);
});
