import { test } from "node:test";
import assert from "node:assert/strict";
import { selectWire } from "../lib/wire-select.ts";

// lib/wire-select.ts is the pure split-out of the landing page's wire rule —
// lib/home-data.ts itself imports ./db, which throws at import time without
// MONGO_URI_READONLY, so it must stay untouched by this test file.

const ghsa = (n: number) => ({ id: `g${n}`, source: "github_advisories" });

test("one bursting source cannot take the whole panel", () => {
  // The 2026-09-09 landing page: five of seven rows were GHSA entries published
  // inside four minutes, burying the Chrome zero-day below the fold.
  const candidates = [
    { id: "chrome", source: "bleepingcomputer" },
    ...Array.from({ length: 10 }, (_, i) => ghsa(i)),
    { id: "ncsc", source: "ncsc" },
    { id: "gtig", source: "google_tig" },
  ];
  const picked = selectWire(candidates, 7, 2);

  assert.equal(picked.length, 7, "panel stays full");
  assert.ok(picked.some((p) => p.id === "chrome"), "the zero-day keeps its slot");
  assert.ok(picked.some((p) => p.id === "ncsc"), "next source promoted into the freed slot");
  assert.ok(picked.some((p) => p.id === "gtig"));
  // Only four sources exist here, so the backfill returns GHSA rows to fill the
  // panel — but they no longer crowd out the other three sources first.
  assert.equal(picked.filter((p) => p.source !== "github_advisories").length, 3);
  assert.deepEqual(picked.slice(0, 5).map((p) => p.id), ["chrome", "g0", "g1", "ncsc", "gtig"]);
});

test("a capped source never sits above a source that hasn't had its turn", () => {
  const picked = selectWire(
    [ghsa(1), ghsa(2), ghsa(3), { id: "a", source: "x" }, { id: "b", source: "y" }],
    5,
    2
  );
  const ids = picked.map((p) => p.id);
  assert.ok(ids.indexOf("a") < ids.indexOf("g3"), "third GHSA demoted below x");
  assert.ok(ids.indexOf("b") < ids.indexOf("g3"), "third GHSA demoted below y");
  assert.deepEqual(ids, ["g1", "g2", "a", "b", "g3"]);
});

test("rows the cap admits stay in candidate order", () => {
  const picked = selectWire(
    [ghsa(1), ghsa(2), { id: "a", source: "x" }, { id: "b", source: "y" }],
    5,
    2
  );
  assert.deepEqual(picked.map((p) => p.id), ["g1", "g2", "a", "b"]);
});

test("a KEV is never dropped to make room for variety", () => {
  const picked = selectWire(
    [ghsa(1), ghsa(2), { id: "exploited", source: "github_advisories", kev: true }, { id: "z", source: "z" }],
    7,
    2
  );
  assert.ok(picked.some((p) => p.id === "exploited"), "KEV bypasses the per-source cap");
});

test("a day with few sources still fills the panel — the cap is soft", () => {
  // Enforced strictly this would render 2 rows and leave the wire looking dead.
  const thin = [ghsa(1), ghsa(2), ghsa(3), ghsa(4), ghsa(5)];
  const picked = selectWire(thin, 7, 2);
  assert.deepEqual(picked.map((p) => p.id), ["g1", "g2", "g3", "g4", "g5"]);
  assert.equal(picked.length, thin.length, "every candidate used before rendering short");
});

test("demoted rows are appended below the promoted ones, not restored to rank", () => {
  // g3 loses its slot to "a"; when the backfill needs it, it comes back at the
  // bottom. Putting it back at its own rank would undo the demotion.
  const picked = selectWire(
    [ghsa(1), ghsa(2), ghsa(3), { id: "a", source: "x" }, ghsa(4)],
    5,
    2
  );
  assert.deepEqual(picked.map((p) => p.id), ["g1", "g2", "a", "g3", "g4"]);
});
