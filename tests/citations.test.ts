import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// lib/citations.ts imports ./slug without an extension; the loader resolves it.
// No database here: lib/citations-db.ts is never imported, every input is a fixture.
register("./ts-ext-loader.mjs", import.meta.url);
const {
  buildDossierCves,
  groupCitationsByActor,
  toPublicCitation,
  citationEvidence,
  rowEvidence,
  rankEvidence,
  storyHref,
  safeUrl,
  relationLabel,
  normCve,
  MAX_QUOTE,
  CVE_RE,
  relationOf,
  relationsIn,
  dossierCitedHeading,
  cveCitedHeading,
  asCitationDoc,
  asActorCveRow,
  displayableCitations,
  citedActorIds,
  cveQueryValues,
  storyIdsNeedingSlugs,
  toPublicCitations,
  cappedCitationsPipeline,
} = await import("../lib/citations.ts");
const { actorIdsFor } = await import("../lib/actor-aliases.ts");

const QUOTE = "APT28 exploited CVE-2023-23397 in Outlook to harvest NTLM hashes from targets.";

function cit(over: Record<string, unknown> = {}) {
  return {
    _id: "c1",
    cve: "CVE-2023-23397",
    actor_id: "apt28",
    actor_text: "Fancy Bear",
    relation: "exploited",
    quote: QUOTE,
    url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-057a",
    host: "www.cisa.gov",
    kind: "report",
    model: "extractor-v1",
    extracted_at: "2026-10-10T08:00:00.000Z",
    kev: true,
    actor_in_quote: true,
    ...over,
  };
}

test("a citation without a quote or a source is dropped, never rendered bare", () => {
  assert.equal(citationEvidence(cit({ quote: "" })), null);
  assert.equal(citationEvidence(cit({ quote: "   " })), null);
  assert.equal(citationEvidence(cit({ url: null })), null);
  assert.equal(citationEvidence(cit({ url: "javascript:alert(1)" })), null, "non-http url refused");
  assert.equal(citationEvidence(cit({ url: "/relative" })), null);
  const ok = citationEvidence(cit());
  assert.ok(ok);
  assert.equal(ok.quote, QUOTE);
  assert.equal(ok.sourceLabel, "cisa.gov");
  assert.equal(ok.external, true);
});

test("wording is 'cited as …', never 'confirmed'", () => {
  for (const r of ["exploited", "used_in_campaign", "attributed_by_report"] as const) {
    assert.doesNotMatch(relationLabel(r), /confirm/i);
  }
  assert.equal(relationLabel("exploited"), "cited as exploiting");
  // An unknown relation degrades to the WEAKEST label (finding 4), never to "exploited".
  assert.equal(citationEvidence(cit({ relation: "confirmed" }))!.relation, "attributed_by_report");
});

test("dossier rows: url when present, else our story link; no evidence means named only", () => {
  const withUrl = rowEvidence({ cve: "CVE-2024-1", evidence: QUOTE, url: "https://example.org/report", source: "report:www.example.org" });
  assert.equal(withUrl!.href, "https://example.org/report");
  assert.equal(withUrl!.sourceLabel, "example.org");
  const slugs = new Map([["url:0123456789abcdef", "0123456789ab-apt28-hits-outlook"]]);
  const storyOnly = rowEvidence({ cve: "CVE-2024-1", evidence: QUOTE, item: "url:0123456789abcdef" }, slugs);
  assert.equal(storyOnly!.href, "/news/0123456789ab-apt28-hits-outlook");
  assert.equal(storyOnly!.external, false);
  assert.equal(rowEvidence({ cve: "CVE-2024-1", item: "url:0123456789abcdef" }), null, "no quote → no evidence");
  assert.equal(rowEvidence({ cve: "CVE-2024-1", evidence: QUOTE }), null, "quote but no source → no evidence");
});

test("storyHref only links engine story ids, by their full slug", () => {
  const slugs = new Map([
    ["cve:CVE-2026-12345", "CVE-2026-123-cve-2026-12345-in-acme-gateway"],
    ["digest:AZ-2026-W33", "AZ-2026-W33-weekly-digest"],
  ]);
  assert.equal(storyHref("cve:CVE-2026-12345", slugs), "/news/CVE-2026-123-cve-2026-12345-in-acme-gateway");
  assert.equal(storyHref("digest:AZ-2026-W33", slugs), "/news/AZ-2026-W33-weekly-digest");
  assert.equal(storyHref("random", slugs), null);
  assert.equal(storyHref(null, slugs), null);
});

test("buildDossierCves groups citations per CVE, newest first, max 5, deduped against the row", () => {
  const rows = [
    // Same quote + url as the first citation below: must print once.
    { cve: "cve-2023-23397", kev: false, epss: 0.9, date: "2026-09-01", source: "report:www.cisa.gov", evidence: QUOTE, url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-057a/" },
    { cve: "CVE-2021-0001", kev: false, epss: 0.2, item: "url:abcdef123456", date: "2026-08-01" },
    { cve: "not-a-cve" },
  ];
  const citations = [
    cit(),
    ...Array.from({ length: 6 }, (_, i) =>
      cit({ _id: `x${i}`, quote: `Report ${i}: APT28 used the Outlook flaw again in wave ${i}.`, url: `https://r${i}.example/a`, host: null, extracted_at: `2026-10-0${i + 1}T00:00:00Z` }),
    ),
    // Only in citations, and lacking a quote: must not create a CVE row.
    cit({ _id: "bad", cve: "CVE-2020-9999", quote: null }),
  ];
  const { cited, named } = buildDossierCves(rows, citations);
  assert.equal(cited.length, 1);
  const c = cited[0];
  assert.equal(c.cve, "CVE-2023-23397");
  assert.equal(c.kev, true, "KEV from the citation counts");
  assert.equal(c.epss, 0.9);
  assert.equal(c.evidence.length, 5);
  assert.equal(c.moreEvidence, 2, "8 raw, 1 duplicate → 7 unique, 5 shown, 2 left out");
  assert.equal(c.evidence[0].date!.slice(0, 10), "2026-10-10", "newest first");
  const dates = c.evidence.map((e) => e.date!);
  assert.deepEqual(dates, [...dates].sort().reverse());
  for (const e of c.evidence) assert.ok(e.quote && e.href, "every shown item has quote and source");
  assert.deepEqual(named.map((n) => n.cve), ["CVE-2021-0001"]);
  assert.equal(named[0].evidence.length, 0);
  assert.ok(![...cited, ...named].some((x) => x.cve === "CVE-2020-9999"));
});

test("buildDossierCves keeps the KEV → EPSS (unknown last) → date order", () => {
  const { named } = buildDossierCves(
    [
      { cve: "CVE-2020-0001", epss: null, date: "2026-01-01" },
      { cve: "CVE-2020-0002", epss: 0.1 },
      { cve: "CVE-2020-0003", kev: true, epss: 0.01 },
      { cve: "CVE-2020-0004", epss: 0.5 },
    ],
    [],
  );
  assert.deepEqual(named.map((n) => n.cve), ["CVE-2020-0003", "CVE-2020-0004", "CVE-2020-0002", "CVE-2020-0001"]);
});

test("groupCitationsByActor uses roster names, falls back to actor_text, orders by newest", () => {
  const groups = groupCitationsByActor(
    [
      cit({ actor_id: "apt29", actor_text: "Cozy Bear", extracted_at: "2026-10-12T00:00:00Z", url: "https://a.example/1", kev: false }),
      cit(),
      cit({ _id: "dup", url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-057a" }),
      cit({ actor_id: "", quote: "orphan citation with no actor id" }),
      cit({ actor_id: "apt29", quote: null }),
    ],
    new Map([["apt28", "APT28"]]),
  );
  assert.deepEqual(groups.map((g) => [g.actorId, g.name]), [["apt29", "Cozy Bear"], ["apt28", "APT28"]]);
  assert.equal(groups[1].evidence.length, 1, "duplicate citation collapsed");
  assert.equal(groups[1].kev, true);
});

test("rankEvidence puts undated evidence last", () => {
  const e = (d: string | null, q: string) => ({ quote: q, href: `https://x/${q}`, sourceLabel: "x", external: true, relation: "exploited" as const, date: d });
  const { shown } = rankEvidence([e(null, "aaaaaaaaa"), e("2026-01-01", "bbbbbbbbb"), e("2026-05-01", "ccccccccc")]);
  assert.deepEqual(shown.map((s) => s.quote), ["ccccccccc", "bbbbbbbbb", "aaaaaaaaa"]);
});

test("long quotes are cut on pages but served whole by the API", () => {
  const long = "x".repeat(MAX_QUOTE + 200);
  assert.equal(citationEvidence(cit({ quote: long }))!.quote.length, MAX_QUOTE);
  const api = toPublicCitation(cit({ quote: long }), (id) => `https://skopnix.com/actors/${id}`);
  assert.equal(api!.quote.length, long.length);
});

test("toPublicCitation shapes the API row and refuses incomplete ones", () => {
  const row = toPublicCitation(cit({ cve: " cve-2023-23397 " }), (id) => `https://skopnix.com/actors/${id}`);
  assert.deepEqual(row, {
    cve: "CVE-2023-23397",
    actor_id: "apt28",
    actor_text: "Fancy Bear",
    actor_url: "https://skopnix.com/actors/apt28",
    relation: "exploited",
    quote: QUOTE,
    source_url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-057a",
    host: "www.cisa.gov",
    kind: "report",
    kev: true,
    actor_in_quote: true,
    extracted_at: "2026-10-10T08:00:00.000Z",
    extracted_by: "extractor-v1",
  });
  const link = (id: string) => id;
  assert.equal(toPublicCitation(cit({ url: "" }), link), null);
  assert.equal(toPublicCitation(cit({ quote: "" }), link), null);
  assert.equal(toPublicCitation(cit({ actor_id: "" }), link), null);
  assert.equal(toPublicCitation(cit({ cve: "nope" }), link), null);
});

test("normCve and safeUrl", () => {
  assert.equal(normCve(" cve-2024-12345 "), "CVE-2024-12345");
  assert.equal(normCve("CVE-24-1"), null);
  assert.equal(safeUrl("ftp://x.example/a"), null);
  assert.equal(safeUrl("https://x.example/a"), "https://x.example/a");
});

// ---- PR #12 review findings: one regression test each -----------------------

test("finding 1: a dispatch link is never a 12-char prefix that can name another CVE", () => {
  // CVE-2026-20212 → key "CVE-2026-202", a prefix of CVE-2026-20200…20299.
  const row = { cve: "CVE-2026-20212", evidence: QUOTE, item: "cve:CVE-2026-20212" };
  assert.equal(rowEvidence(row), null, "no resolved slug → no link, so no evidence");
  assert.equal(storyHref("cve:CVE-2026-20212"), null);
  const slugs = new Map([["cve:CVE-2026-20212", "CVE-2026-202-cve-2026-20212-cisco-ios-xe-flaw"]]);
  const ev = rowEvidence(row, slugs)!;
  assert.equal(ev.href, "/news/CVE-2026-202-cve-2026-20212-cisco-ios-xe-flaw");
  assert.notEqual(ev.href, "/news/CVE-2026-202");
  // A slug for a DIFFERENT story id is never borrowed.
  assert.equal(storyHref("cve:CVE-2026-20212", new Map([["cve:CVE-2026-20200", "CVE-2026-202-x"]])), null);
  // The dossier asks for exactly the ids it would link.
  assert.deepEqual(
    storyIdsNeedingSlugs([
      row,
      { cve: "CVE-2026-1111", evidence: QUOTE, item: "url:aaaa1111bbbb", url: "https://r.example/x" },
      { cve: "CVE-2026-2222", item: "url:cccc2222dddd" },
      { cve: "CVE-2026-3333", evidence: 42, item: "url:eeee" },
    ]),
    ["cve:CVE-2026-20212"],
  );
  const { cited, named } = buildDossierCves([row], [], slugs);
  assert.equal(cited[0].evidence[0].href, "/news/CVE-2026-202-cve-2026-20212-cisco-ios-xe-flaw");
  assert.equal(buildDossierCves([row], []).cited.length, 0, "unresolved → named only, never a guessed link");
  assert.equal(named.length, 0);
});

test("finding 2: alias actor ids are grouped and linked under the canonical actor", () => {
  const groups = groupCitationsByActor(
    [
      cit({ actor_id: "nobelium", actor_text: "NOBELIUM", url: "https://a.example/1" }),
      cit({ actor_id: "unc2452", actor_text: "UNC2452", url: "https://b.example/2" }),
      cit({ actor_id: "apt29", actor_text: "Cozy Bear", url: "https://c.example/3" }),
      cit({ actor_id: "  Midnight-Blizzard ", url: "https://d.example/4" }),
    ],
    new Map([["apt29", "APT29"]]),
  );
  assert.equal(groups.length, 1, "APT29 shown once, not once per alias");
  assert.equal(groups[0].actorId, "apt29");
  assert.equal(groups[0].name, "APT29");
  assert.equal(groups[0].evidence.length, 4);
  assert.deepEqual(citedActorIds([cit({ actor_id: "nobelium" }), cit({ actor_id: "apt29" })]), ["apt29"]);
  const api = toPublicCitation(cit({ actor_id: "unc2452" }), (id) => `https://skopnix.com/actors/${id}`)!;
  assert.equal(api.actor_id, "apt29");
  assert.equal(api.actor_url, "https://skopnix.com/actors/apt29");
  // The dossier read covers every stored id of the canonical actor.
  const ids = actorIdsFor("apt29");
  for (const id of ["apt29", "nobelium", "unc2452", "midnight-blizzard", "dark-halo", "darkhalo"]) assert.ok(ids.includes(id), id);
  assert.deepEqual(actorIdsFor("nobelium").sort(), [...ids].sort(), "an alias resolves to the same set");
  assert.deepEqual(actorIdsFor("apt28"), ["apt28"]);
});

test("finding 3: a malformed engine row is dropped, never thrown on", () => {
  const bad = [
    cit({ quote: 12345 }),
    cit({ actor_id: { $oid: "x" } }),
    cit({ host: 7 }),
    cit({ cve: ["CVE-2023-23397"] }),
    cit({ url: { href: "https://x" } }),
    cit({ actor_text: 1 }),
    cit({ relation: 3 }),
    cit({ extracted_at: 17 }),
    cit({ kev: "yes" }),
    cit({ actor_in_quote: "true" }),
    null,
    "a string",
    42,
  ];
  for (const b of bad) {
    assert.equal(asCitationDoc(b), null, JSON.stringify(b));
    assert.doesNotThrow(() => citationEvidence(b));
    assert.equal(citationEvidence(b), null);
    assert.equal(toPublicCitation(b, (id) => id), null);
  }
  const good = cit({ url: "https://good.example/1" });
  assert.doesNotThrow(() => groupCitationsByActor([...bad, good]));
  assert.equal(groupCitationsByActor([...bad, good]).length, 1);
  assert.equal(toPublicCitations([...bad, good], (id) => id).length, 1);
  assert.doesNotThrow(() => groupCitationsByActor("not an array"));
  const badRows = [
    { cve: 5 },
    { cve: "CVE-2024-0001", evidence: { t: "x" } },
    { cve: "CVE-2024-0002", source: 1, evidence: QUOTE, url: "https://x.example" },
    { cve: "CVE-2024-0003", item: ["cve:x"], evidence: QUOTE },
    { cve: "CVE-2024-0004", epss: "0.5" },
    { cve: "CVE-2024-0005", date: 20240101 },
    undefined,
  ];
  for (const r of badRows) {
    assert.equal(asActorCveRow(r), null, JSON.stringify(r));
    assert.doesNotThrow(() => rowEvidence(r));
  }
  const out = buildDossierCves([...badRows, { cve: "CVE-2024-0009" }], [...bad, good]);
  assert.deepEqual(out.cited.map((c) => c.cve), ["CVE-2023-23397"]);
  assert.deepEqual(out.named.map((c) => c.cve), ["CVE-2024-0009"]);
});

test("finding 4: an unknown or null relation is the weakest claim, not 'exploited'", () => {
  assert.equal(relationOf(null), "attributed_by_report");
  assert.equal(relationOf(undefined), "attributed_by_report");
  assert.equal(relationOf("exploits"), "attributed_by_report");
  assert.equal(relationOf("exploited"), "exploited");
  assert.equal(relationOf("used_in_campaign"), "used_in_campaign");
  assert.equal(citationEvidence(cit({ relation: null }))!.relation, "attributed_by_report");
  assert.equal(toPublicCitation(cit({ relation: "confirmed" }), (id) => id)!.relation, "attributed_by_report");
  // A dossier row carries no relation: it is not upgraded to "exploited" either.
  assert.equal(rowEvidence({ cve: "CVE-2024-1", evidence: QUOTE, url: "https://x.example/r" })!.relation, "attributed_by_report");
});

test("finding 5: headings are worded from the relations present", () => {
  const ev = (relation: string) => citationEvidence(cit({ relation, url: `https://${relation}.example/` }))!;
  assert.equal(dossierCitedHeading(relationsIn([[ev("attributed_by_report")]]), "APT28"), "CVEs reports attribute to APT28");
  assert.equal(cveCitedHeading(relationsIn([[ev("attributed_by_report")], [ev("attributed_by_report")]])), "Attributed by reports to");
  assert.equal(dossierCitedHeading(relationsIn([[ev("exploited")]]), "APT28"), "CVEs APT28 is cited as exploiting");
  assert.equal(cveCitedHeading(relationsIn([[ev("exploited")]])), "Cited as exploited by");
  assert.equal(cveCitedHeading(relationsIn([[ev("used_in_campaign")]])), "Cited as used in a campaign by");
  const mixed = relationsIn([[ev("exploited")], [ev("attributed_by_report")]]);
  assert.deepEqual(mixed, ["exploited", "attributed_by_report"]);
  assert.doesNotMatch(dossierCitedHeading(mixed, "APT28"), /exploit/);
  assert.doesNotMatch(cveCitedHeading(mixed), /exploit/);
  for (const h of [dossierCitedHeading(mixed, "X"), cveCitedHeading(mixed)]) assert.doesNotMatch(h, /confirm/i);
});

test("finding 6: CVE ids are normalised the same way on both sides", () => {
  assert.deepEqual(cveQueryValues("CVE-2023-23397").sort(), ["CVE-2023-23397", "cve-2023-23397"].sort());
  // A lower-case stored row is grouped and served under the upper-case id.
  assert.equal(toPublicCitation(cit({ cve: "cve-2023-23397" }), (id) => id)!.cve, "CVE-2023-23397");
  assert.equal(displayableCitations([cit({ cve: "cve-2023-23397" })]).length, 1);
  assert.equal(buildDossierCves([], [cit({ cve: "cve-2023-23397" })]).cited[0].cve, "CVE-2023-23397");
  // Both sides use the same normCve.
  assert.equal(normCve(" cve-2023-23397"), "CVE-2023-23397");
  assert.equal(normCve(12345), null);
});

test("finding 7: the CVE page gate counts only displayable citations", () => {
  const incomplete = [
    cit({ quote: null }),
    cit({ url: "" }),
    cit({ url: "javascript:alert(1)" }),
    cit({ actor_id: "  " }),
    cit({ cve: "not-a-cve" }),
    cit({ quote: 5 }),
  ];
  assert.equal(displayableCitations(incomplete).length, 0, "nothing printable → gate stays shut");
  assert.equal(groupCitationsByActor(incomplete).length, 0);
  assert.equal(displayableCitations([...incomplete, cit()]).length, 1);
});

test("finding 9: the capped read groups first, then caps, so a hot CVE cannot crowd out the rest", () => {
  const p = cappedCitationsPipeline({ actor_id: { $in: ["apt28"] } }, "cve", 48, 20);
  const stage = (k: string) => p.findIndex((s) => k in s);
  assert.ok(stage("$group") > -1);
  assert.ok(stage("$group") < stage("$limit"), "$limit applies to groups, after $group");
  const proj = p.filter((s) => "$project" in s).map((s) => JSON.stringify(s));
  assert.ok(proj.some((s) => s.includes('"$slice":["$docs",20]')), "per-group cap");
  assert.ok(stage("$sort") < stage("$group"), "newest first inside each group");
  // The group key upper-cases the CVE, so cve-… and CVE-… share one group.
  const g = p[stage("$group")] as { $group: { _id: unknown } };
  assert.match(JSON.stringify(g.$group._id), /\$toUpper/);
  // Malformed types are excluded before $toUpper can fail on them.
  // (the aggregation $type: a query {$type:"string"} also matches ["CVE-…"] and $trim throws on it).
  const guard = p.findIndex((s) => JSON.stringify(s).includes('{"$type":"$cve"}'));
  assert.ok(guard > -1 && guard < stage("$group"));
  assert.equal(JSON.stringify(cappedCitationsPipeline({}, "actor_id", 1, 1)).includes("$toLower"), true);
});

test("finding 11: the page and the lib share one CVE pattern", () => {
  assert.ok(CVE_RE.test("CVE-2026-20212"));
  assert.ok(!CVE_RE.test("CVE-26-1"));
});

test("actor_in_quote: quote-named citations first; nearby ones labelled, not hidden", () => {
  const near = citationEvidence(cit({ actor_in_quote: false, url: "https://near.example/", extracted_at: "2026-10-15T00:00:00Z" }))!;
  const inq = citationEvidence(cit({ actor_in_quote: true, url: "https://in.example/", extracted_at: "2026-09-01T00:00:00Z" }))!;
  assert.equal(near.inQuote, false);
  assert.equal(inq.inQuote, true);
  // Unknown (an older row) is not claimed as named in the quote.
  assert.equal(citationEvidence(cit({ actor_in_quote: null }))!.inQuote, false);
  const { shown } = rankEvidence([near, inq]);
  assert.deepEqual(shown.map((e) => e.href), ["https://in.example/", "https://near.example/"], "quote-named first even when older");
  const g = groupCitationsByActor([
    cit({ actor_in_quote: false, url: "https://near.example/", extracted_at: "2026-10-15T00:00:00Z" }),
    cit({ actor_in_quote: true, url: "https://in.example/", extracted_at: "2026-09-01T00:00:00Z" }),
  ]);
  assert.deepEqual(g[0].evidence.map((e) => e.inQuote), [true, false]);
  const api = toPublicCitations(
    [cit({ _id: "n", actor_in_quote: false, url: "https://near.example/" }), cit({ _id: "i", actor_in_quote: true, url: "https://in.example/" })],
    (id) => id,
  );
  assert.deepEqual(api.map((c) => c.actor_in_quote), [true, false]);
});

