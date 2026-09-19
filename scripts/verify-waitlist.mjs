#!/usr/bin/env node
// Proves the signup path works end to end: solves the live proof-of-work, POSTs a
// real address to production, then reads the row back out of Mongo through the
// read-only credential. Exits non-zero on any failure so it cannot quietly "look
// fine". Needs MONGO_URI_READONLY in the environment or in ../.env.local.
//
//   node scripts/verify-waitlist.mjs                                   # against https://skopnix.com
//   HEALTH_BASE=https://ctiaze-web.vercel.app node scripts/verify-waitlist.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { MongoClient } = require("mongodb");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.HEALTH_BASE || "https://skopnix.com").replace(/\/$/, "");
const EMAIL = `probe+${Date.now()}@skopnix.com`;

function fromEnvFile(name) {
  try {
    const line = readFileSync(path.join(ROOT, ".env.local"), "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim().replace(/^"|"$/g, "") : undefined;
  } catch {
    return undefined;
  }
}
const uri = process.env.MONGO_URI_READONLY || fromEnvFile("MONGO_URI_READONLY");
if (!uri) {
  console.error("  ✗ MONGO_URI_READONLY is not set (environment or .env.local)");
  process.exit(2);
}

const lz = (h) => { let b = 0; for (const ch of h) { const v = parseInt(ch, 16); if (v === 0) { b += 4; continue; } b += Math.clz32(v) - 28; break; } return b; };

const chal = await (await fetch(`${BASE}/api/challenge`)).json();
let nonce = 0;
while (lz(createHash("sha256").update(`${chal.c}:${nonce}`).digest("hex")) < chal.d) nonce++;

const res = await fetch(`${BASE}/api/waitlist`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-pow": `${chal.c}.${chal.t}.${chal.s}.${nonce}` },
  body: JSON.stringify({ email: EMAIL, source: "verify" }),
});
const body = await res.text();
console.log(`  POST ${BASE}/api/waitlist -> ${res.status} ${body}`);
if (res.status !== 200) { console.error("  ✗ endpoint not storing"); process.exit(1); }

// Read it back through the independent read-only credential.
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const col = client.db("ctiaze").collection("signups");
const found = await col.findOne({ email: EMAIL });
const total = await col.countDocuments({});
await client.close();
console.log(`  mongo readback: ${found ? "FOUND" : "MISSING"} | total: ${total}`);
if (!found) { console.error("  ✗ stored nothing"); process.exit(1); }
console.log(`  ✓ signups are being saved (test row ${EMAIL} — delete it from /admin)`);
