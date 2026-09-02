// Full logical backup / restore of the Atlas database, using only the Node driver
// (no mongodump/mongorestore, no Homebrew needed).
//
// Documents are written as Extended JSON in *canonical* mode, one per line, then
// gzipped — canonical EJSON round-trips BSON types exactly, so ObjectIds stay
// ObjectIds and Dates stay Dates instead of decaying into strings. Index
// definitions are captured alongside the data so a restore rebuilds them.
//
//   node scripts/db-backup.mjs backup  <outDir>
//   node scripts/db-backup.mjs verify  <outDir>
//   node scripts/db-backup.mjs restore <outDir>      # needs RESTORE_URI
//
// backup/verify read MONGO_URI_READONLY; restore writes to RESTORE_URI so a
// restore can never be aimed at the source cluster by accident.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { pipeline } from "node:stream/promises";
import { MongoClient } from "mongodb";
import { EJSON } from "bson";

const DB_NAME = "ctiaze";
const [, , cmd, outDir] = process.argv;

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i < 1 || line.trimStart().startsWith("#")) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.join(import.meta.dirname, "..", ".env.local"));

const isRestore = cmd === "restore";
const uri = isRestore ? process.env.RESTORE_URI : process.env.MONGO_URI_READONLY;
if (!cmd || !outDir) {
  console.error("usage: node scripts/db-backup.mjs <backup|verify|restore> <dir>");
  process.exit(1);
}
if (!uri) {
  console.error(isRestore ? "RESTORE_URI is not set." : "MONGO_URI_READONLY is not set.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
await client.connect();
const db = client.db(DB_NAME);

async function backup() {
  fs.mkdirSync(outDir, { recursive: true });
  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const manifest = { db: DB_NAME, takenAt: new Date().toISOString(), collections: [] };

  for (const name of names) {
    const col = db.collection(name);
    const expected = await col.countDocuments();
    const file = path.join(outDir, `${name}.jsonl.gz`);
    const gzip = zlib.createGzip({ level: 9 });
    const out = fs.createWriteStream(file);
    const done = pipeline(gzip, out);

    let written = 0;
    for await (const doc of col.find({}, { noCursorTimeout: false })) {
      // canonical mode: preserves $oid / $date / $numberLong exactly
      if (!gzip.write(EJSON.stringify(doc, { relaxed: false }) + "\n")) {
        await new Promise((r) => gzip.once("drain", r));
      }
      written++;
    }
    gzip.end();
    await done;

    const indexes = (await col.indexes()).filter((ix) => ix.name !== "_id_");
    manifest.collections.push({ name, count: written, expected, indexes });
    const kb = (fs.statSync(file).size / 1024).toFixed(0);
    const flag = written === expected ? "" : `  ⚠ expected ${expected}`;
    console.log(`  ${name.padEnd(22)} ${String(written).padStart(7)} docs  ${kb.padStart(6)}KB${flag}`);
  }

  fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2));
  const total = manifest.collections.reduce((a, c) => a + c.count, 0);
  const bytes = fs.readdirSync(outDir).reduce((a, f) => a + fs.statSync(path.join(outDir, f)).size, 0);
  console.log(`\n  ${manifest.collections.length} collections · ${total.toLocaleString()} docs · ${(bytes / 1048576).toFixed(1)}MB on disk`);
  console.log(`  → ${outDir}`);
}

// Re-read every dumped file and compare against the live database. A backup you
// have not read back is not a backup.
async function verify() {
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "_manifest.json"), "utf8"));
  let bad = 0;
  for (const entry of manifest.collections) {
    const file = path.join(outDir, `${entry.name}.jsonl.gz`);
    let lines = 0;
    let firstErr = null;
    const rl = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      lines++;
      if (lines === 1) {
        try { EJSON.parse(line, { relaxed: false }); } catch (e) { firstErr = e.message.slice(0, 60); }
      }
    }
    const live = await db.collection(entry.name).countDocuments();
    const ok = lines === entry.count && lines === live && !firstErr;
    if (!ok) bad++;
    console.log(`  ${ok ? "✓" : "✗"} ${entry.name.padEnd(22)} file=${String(lines).padStart(7)} live=${String(live).padStart(7)}${firstErr ? "  parse: " + firstErr : ""}`);
  }
  console.log(bad === 0 ? "\n  ALL COLLECTIONS MATCH ✓" : `\n  ${bad} MISMATCH(ES) ✗`);
  if (bad) process.exitCode = 1;
}

async function restore() {
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "_manifest.json"), "utf8"));
  for (const entry of manifest.collections) {
    const col = db.collection(entry.name);
    if ((await col.countDocuments()) > 0) {
      console.log(`  ${entry.name.padEnd(22)} SKIPPED — target not empty`);
      continue;
    }
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(outDir, `${entry.name}.jsonl.gz`)).pipe(zlib.createGunzip()) });
    let batch = [];
    let n = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      batch.push(EJSON.parse(line, { relaxed: false }));
      if (batch.length >= 1000) { await col.insertMany(batch, { ordered: false }); n += batch.length; batch = []; }
    }
    if (batch.length) { await col.insertMany(batch, { ordered: false }); n += batch.length; }
    for (const ix of entry.indexes ?? []) {
      const { key, name, v, ...opts } = ix;
      void v;
      await col.createIndex(key, { name, ...opts }).catch((e) => console.log(`    index ${name}: ${e.message.slice(0, 50)}`));
    }
    console.log(`  ${entry.name.padEnd(22)} ${String(n).padStart(7)} docs restored${entry.indexes?.length ? ` + ${entry.indexes.length} index(es)` : ""}`);
  }
  console.log("\n  restore complete — now run `verify` against the NEW cluster");
}

try {
  if (cmd === "backup") await backup();
  else if (cmd === "verify") await verify();
  else if (cmd === "restore") await restore();
  else console.error(`unknown command: ${cmd}`);
} finally {
  await client.close();
}
