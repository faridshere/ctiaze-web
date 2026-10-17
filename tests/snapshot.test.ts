import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The module reads SNAPSHOT_DIR once at import, so point it at a fresh temp
// directory before the (dynamic) import.
const dir = mkdtempSync(join(tmpdir(), "skopnix-snapshot-"));
process.env.SNAPSHOT_DIR = dir;
const { withSnapshot } = await import("../lib/snapshot.ts");

test("a successful read is returned and written to disk", async () => {
  const v = await withSnapshot("t1", async () => ({ n: 1, at: "2026-10-16T00:00:00.000Z" }));
  assert.deepEqual(v, { n: 1, at: "2026-10-16T00:00:00.000Z" });
  const saved = JSON.parse(readFileSync(join(dir, "t1.json"), "utf8"));
  assert.deepEqual(saved.value, v);
  assert.ok(saved.savedAt);
  assert.ok(!existsSync(join(dir, `t1.json.${process.pid}.tmp`)), "temp file must be renamed away");
});

test("a failed read serves the last good copy, unchanged", async () => {
  await withSnapshot("t2", async () => ({ total: 1139 }));
  const v = await withSnapshot("t2", async () => {
    throw new Error("MongoServerSelectionError");
  });
  assert.deepEqual(v, { total: 1139 });
});

test("a failed read with no copy rethrows, so the caller's own fallback applies", async () => {
  await assert.rejects(
    withSnapshot("t3-never-written", async () => {
      throw new Error("down");
    }),
    /down/,
  );
});

test("a newer successful read replaces the copy", async () => {
  await withSnapshot("t4", async () => ({ v: "old" }));
  await withSnapshot("t4", async () => ({ v: "new" }));
  const v = await withSnapshot("t4", async () => {
    throw new Error("down");
  });
  assert.deepEqual(v, { v: "new" });
});
