import { test } from "node:test";
import assert from "node:assert/strict";
import { OUTAGES, outageOn, outageSpan, outagesIn } from "../lib/outages.ts";

const days = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));

test("the October outage shows while it is inside the fourteen days, and not after", () => {
  assert.deepEqual(outagesIn(days("2026-10-04", 14)), OUTAGES);
  assert.deepEqual(outagesIn(days("2026-10-15", 14)), OUTAGES); // last outage day still in view
  assert.deepEqual(outagesIn(days("2026-10-16", 14)), []);
  assert.deepEqual(outagesIn([]), []);
});

test("outageOn marks only the outage days", () => {
  assert.equal(outageOn("2026-10-10"), null);
  assert.equal(outageOn("2026-10-11")?.what, "ingestion outage");
  assert.equal(outageOn("2026-10-15")?.what, "ingestion outage");
  assert.equal(outageOn("2026-10-16"), null);
});

test("outageSpan reads like a dateline", () => {
  assert.equal(outageSpan(OUTAGES[0]), "11–15 Oct");
  assert.equal(outageSpan({ from: "2026-09-28", to: "2026-10-02", what: "x" }), "28 Sep–2 Oct");
  assert.equal(outageSpan({ from: "2026-10-03", to: "2026-10-03", what: "x" }), "3 Oct");
});
