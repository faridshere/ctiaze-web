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
} = await import("../lib/citations.ts");

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
  // An unknown relation degrades to the default label, not to something stronger.
  assert.equal(citationEvidence(cit({ relation: "confirmed" }))!.relation, "exploited");
});

test("dossier rows: url when present, else our story link; no evidence means named only", () => {
  const withUrl = rowEvidence({ cve: "CVE-2024-1", evidence: QUOTE, url: "https://example.org/report", source: "report:www.example.org" });
  assert.equal(withUrl!.href, "https://example.org/report");
  assert.equal(withUrl!.sourceLabel, "example.org");
  const storyOnly = rowEvidence({ cve: "CVE-2024-1", evidence: QUOTE, item: "url:0123456789abcdef" });
  assert.equal(storyOnly!.href, "/news/0123456789ab");
  assert.equal(storyOnly!.external, false);
  assert.equal(rowEvidence({ cve: "CVE-2024-1", item: "url:0123456789abcdef" }), null, "no quote → no evidence");
  assert.equal(rowEvidence({ cve: "CVE-2024-1", evidence: QUOTE }), null, "quote but no source → no evidence");
});

test("storyHref only links engine story ids", () => {
  assert.equal(storyHref("cve:CVE-2026-12345"), "/news/CVE-2026-123");
  assert.equal(storyHref("digest:AZ-2026-W33"), "/news/AZ-2026-W33");
  assert.equal(storyHref("random"), null);
  assert.equal(storyHref(null), null);
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
