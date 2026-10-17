import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// lib/taxii.ts and lib/misp.ts use extensionless relative imports
// (see tests/ts-ext-loader.mjs). Must run before the imports below.
register("./ts-ext-loader.mjs", import.meta.url);
const taxii = await import("../lib/taxii.ts");
const misp = await import("../lib/misp.ts");
const cited = await import("../lib/cited.ts");
const { validateStix, validateObjects } = await import("./stix-schema.ts");
const { CITED_ACTOR, CITED_ROWS } = await import("./fixtures/cited.ts");

type Item = import("../lib/taxii.ts").StreamItem;

// --- TAXII ------------------------------------------------------------------

test("discovery and api-root carry the properties TAXII 2.1 requires", () => {
  const d = taxii.discovery();
  assert.ok(d.title);
  assert.deepEqual(d.api_roots, ["https://skopnix.com/api/v1/taxii2/"]);
  assert.equal(d.default, d.api_roots[0]);
  assert.ok(d.api_roots.every((u) => u.endsWith("/")), "API root URLs end in /");
  const r = taxii.apiRoot();
  assert.deepEqual(r.versions, ["application/taxii+json;version=2.1"]);
  assert.equal(typeof r.max_content_length, "number");
});

test("two read-only collections, findable by id or title", () => {
  assert.deepEqual(taxii.COLLECTIONS.map((c) => c.title), ["cited-intel", "az-claims"]);
  for (const c of taxii.COLLECTIONS) {
    assert.match(c.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(c.can_read, true);
    assert.equal(c.can_write, false);
    assert.deepEqual(c.media_types, ["application/stix+json;version=2.1"]);
    assert.equal(taxii.findCollection(c.id), c);
    assert.equal(taxii.findCollection(c.title.toUpperCase()), c);
  }
  assert.equal(taxii.findCollection("darkweb"), null);
});

test("Accept: TAXII 2.1, JSON and wildcards pass; another TAXII version or HTML is a 406", () => {
  for (const ok of [null, "*/*", "application/json", "application/taxii+json", "application/taxii+json;version=2.1", "text/html, application/taxii+json; version=2.1"]) {
    assert.equal(taxii.acceptsTaxii(ok), true, String(ok));
  }
  for (const bad of ["application/taxii+json;version=2.0", "text/html", "application/xml"]) {
    assert.equal(taxii.acceptsTaxii(bad), false, bad);
  }
});

test("query parsing: limit is clamped to 3..1000, bad added_after or next is an error", () => {
  const q = (s: string) => taxii.parseObjectsQuery(new URLSearchParams(s));
  assert.deepEqual(q(""), { addedAfter: null, limit: 1000, next: null });
  assert.equal((q("limit=5000") as { limit: number }).limit, 1000);
  assert.equal((q("limit=1") as { limit: number }).limit, 3);
  assert.ok("error" in q("limit=0"));
  assert.ok("error" in q("limit=abc"));
  assert.ok("error" in q("added_after=yesterday"));
  assert.ok("error" in q("added_after=2026-10-01"));
  assert.ok("error" in q("next=garbage"));
  assert.equal((q("added_after=2026-10-01T00:00:00Z") as { addedAfter: string }).addedAfter, "2026-10-01T00:00:00.000Z");
});

test("cursors round-trip, and forged ones are refused", () => {
  const c = { at: "2026-10-01T00:00:00.000Z", k: 1, sid: "66f1a2b30000000000000000" };
  assert.deepEqual(taxii.decodeCursor(taxii.encodeCursor(c)), c);
  assert.equal(taxii.decodeCursor(Buffer.from('["x",1,"a"]').toString("base64url")), null);
  assert.equal(taxii.decodeCursor(Buffer.from('["2026-10-01T00:00:00Z",99,"a"]').toString("base64url")), null);
});

test("added_after is strict, and next wins when it is further along", () => {
  const after = taxii.streamStart({ addedAfter: "2026-10-01T00:00:00.000Z", limit: 10, next: null })!;
  const sameInstant = { at: "2026-10-01T00:00:00.000Z", k: 2, sid: "zzz" };
  assert.ok(taxii.compareCursor(sameInstant, after) < 0, "a row added exactly at added_after is excluded");
  const later = { at: "2026-10-02T00:00:00.000Z", k: 0, sid: "a" };
  assert.deepEqual(taxii.streamStart({ addedAfter: "2026-10-01T00:00:00.000Z", limit: 10, next: later }), later);
  assert.equal(taxii.streamStart({ addedAfter: null, limit: 10, next: null }), null);
});

// A fake source: n rows at one-second steps, each yielding a target and a relationship.
const obj = (id: string) => ({ type: "x", id });
function source(k: number, n: number, sameSecond = false): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    at: new Date(Date.UTC(2026, 9, 1, 0, 0, sameSecond ? 0 : i)).toISOString(),
    k,
    sid: String(i).padStart(4, "0"),
    objects: [obj(`shared--${k}`), obj(`rel--${k}-${i}`)],
  }));
}

/** Walk a collection page by page the way a TAXII client does. */
function walk(sources: Item[][], limit: number) {
  const seen: string[] = [];
  let next: import("../lib/taxii.ts").Cursor | null = null;
  for (let pages = 1; pages < 100; pages++) {
    const start = taxii.streamStart({ addedAfter: null, limit, next });
    const reads = sources.map((rows) => {
      const after = rows.filter((r) => !start || taxii.compareCursor(r, start) > 0);
      return { items: after.slice(0, limit + 1), truncated: after.length > limit + 1 };
    });
    const { stream, truncated } = taxii.mergeStreams(reads);
    const page = taxii.packPage(stream, limit, [], truncated);
    assert.ok((page.envelope.objects?.length ?? 0) <= limit, "never more than limit objects");
    for (const o of page.envelope.objects ?? []) seen.push(o.id);
    if (!page.envelope.more) return { seen, pages };
    next = taxii.decodeCursor(page.envelope.next!);
  }
  throw new Error("paging did not terminate");
}

test("paging visits every row exactly once, even with many rows in the same second", () => {
  const sources = [source(0, 37), source(1, 23, true), source(2, 5)];
  const { seen, pages } = walk(sources, 7);
  const rels = seen.filter((id) => id.startsWith("rel--"));
  assert.equal(rels.length, 37 + 23 + 5);
  assert.equal(new Set(rels).size, rels.length, "no row twice");
  assert.ok(pages > 5);
});

test("a page never splits a row and never repeats an object it already holds", () => {
  const { stream, truncated } = taxii.mergeStreams([{ items: source(0, 4), truncated: false }]);
  const page = taxii.packPage(stream, 4, [], truncated);
  // shared + rel0 + rel1 + rel2 = 4; rel3 does not fit
  assert.deepEqual(page.envelope.objects?.map((o) => o.id), ["shared--0", "rel--0-0", "rel--0-1", "rel--0-2"]);
  assert.equal(page.envelope.more, true);
  assert.equal(page.first, "2026-10-01T00:00:00.000Z");
  assert.equal(page.last, "2026-10-01T00:00:02.000Z");
});

test("an empty collection answers more: false with no objects", () => {
  const page = taxii.packPage([], 100, cited.taxiiPrelude(), false);
  assert.deepEqual(page.envelope, { more: false });
  assert.equal(page.first, null);
});

test("a cited-intel page built from fixture rows validates as STIX 2.1", () => {
  const actors = new Map([[CITED_ACTOR._id, CITED_ACTOR]]);
  const items: Item[] = cited.assertionsFor(CITED_ROWS, actors).map((a, i) => ({
    at: a.at,
    k: 0,
    sid: String(i),
    objects: cited.objectsFor([a]).map((d) => d.object),
  }));
  const { stream } = taxii.mergeStreams([{ items, truncated: false }]);
  const page = taxii.packPage(stream, 1000, cited.taxiiPrelude(), false);
  const objects = page.envelope.objects!;
  assert.deepEqual(validateObjects(objects), []);
  assert.deepEqual(validateStix({ type: "bundle", id: "bundle--4f1d3c7e-3f0a-4d6e-9d39-1d4f2f1c8a10", objects }), []);
  // every reference on the page resolves on the page
  const ids = new Set(objects.map((o) => o.id));
  for (const o of objects) {
    for (const ref of [o.source_ref, o.target_ref, o.created_by_ref, ...(o.object_marking_refs ?? [])]) {
      if (ref) assert.ok(ids.has(ref), `${o.id} → ${ref}`);
    }
  }
});

// --- MISP -------------------------------------------------------------------

const event = misp.mispEvent(CITED_ACTOR, CITED_ROWS.cves, CITED_ROWS.iocs).Event;
const attr = (type: string, value?: string) =>
  event.Attribute.filter((a) => a.type === type && (value === undefined || a.value === value));

test("the MISP event carries the fields a feed consumer needs", () => {
  assert.equal(event.uuid, misp.mispEventUuid("apt28"));
  assert.match(event.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(event.timestamp, /^\d+$/);
  assert.equal(event.Orgc.name, "skopnix");
  assert.ok(event.Tag.some((t) => t.name === "tlp:white"));
  for (const a of event.Attribute) {
    assert.match(a.uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.ok(a.type && a.category && a.value);
    assert.match(a.timestamp, /^\d+$/);
  }
});

test("MISP: indicators map to MISP types, with the quote and source as the comment", () => {
  assert.equal(attr("sha256").length, 1);
  assert.equal(attr("ip-dst").length, 2);
  assert.equal(attr("domain", "evil.example.com").length, 1);
  assert.equal(attr("url", "http://evil.example.com/a'b").length, 1);
  assert.equal(attr("email-src").length, 1);
  assert.equal(attr("filename")[0].to_ids, false);
  assert.equal(attr("sha256")[0].to_ids, true);
  assert.equal(attr("sha256")[0].comment, '"Dropper hash." — https://research.example.com/iocs');
  assert.ok(!event.Attribute.some((a) => a.value === "deadbeef" || a.value === "uncited.example.com"));
});

test("MISP: CVEs are vulnerability attributes, one per CVE, citing each report once", () => {
  const v = attr("vulnerability", "CVE-2023-23397");
  assert.equal(v.length, 1, "MISP refuses the same value twice in one event");
  assert.equal(v[0].to_ids, false);
  assert.equal(
    v[0].comment,
    '"The Outlook flaw was used to steal NTLM hashes." — https://news.example.org/outlook-ntlm | "APT28 exploited CVE-2023-23397 against European energy targets." — https://research.example.com/apt28-outlook',
  );
  assert.deepEqual(attr("vulnerability").map((a) => a.value).sort(), ["CVE-2023-23397", "CVE-2024-0001"]);
});

test("MISP: deterministic, stamped with the newest citation, and the manifest agrees", () => {
  const again = misp.mispEvent(CITED_ACTOR, [...CITED_ROWS.cves].reverse(), [...CITED_ROWS.iocs].reverse());
  assert.equal(JSON.stringify(again.Event), JSON.stringify(event));
  assert.equal(event.timestamp, String(Date.parse("2026-10-04T10:00:00Z") / 1000));
  const m = misp.manifestEntry(CITED_ACTOR, "2026-10-04T10:00:00.000Z");
  assert.equal(m.timestamp, event.timestamp);
  assert.equal(m.info, event.info);
  assert.equal(m.date, event.date);
});

test("MISP: an explicit stamp wins, so the event always matches its manifest row", () => {
  // The newest cited row can be one the event drops (here a malformed hash):
  // the manifest counts it, so the event must take the manifest's instant.
  const rows = [
    ...CITED_ROWS.iocs,
    { actor_id: "apt28", type: "sha256", value: "short", url: "https://research.example.com/x", extracted_at: "2026-10-09T00:00:00Z" },
  ];
  const stamped = misp.mispEvent(CITED_ACTOR, CITED_ROWS.cves, rows, "2026-10-09T00:00:00.000Z").Event;
  const m = misp.manifestEntry(CITED_ACTOR, "2026-10-09T00:00:00.000Z");
  assert.equal(stamped.timestamp, m.timestamp);
  assert.equal(stamped.date, "2026-10-09");
  assert.equal(stamped.Attribute.length, event.Attribute.length, "the malformed row adds nothing");
});

test("MISP: the attribute cap keeps the newest", () => {
  const many = Array.from({ length: misp.MAX_ATTRIBUTES + 50 }, (_, i) => ({
    actor_id: "apt28",
    type: "domain",
    value: `d${i}.example.com`,
    quote: "q",
    url: "https://research.example.com/many",
    extracted_at: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
  }));
  const e = misp.mispEvent(CITED_ACTOR, [], many).Event;
  const domains = e.Attribute.filter((a) => a.type === "domain");
  assert.equal(domains.length, misp.MAX_ATTRIBUTES);
  assert.ok(domains.some((a) => a.value === `d${misp.MAX_ATTRIBUTES + 49}.example.com`));
  assert.ok(!domains.some((a) => a.value === "d0.example.com"));
});
