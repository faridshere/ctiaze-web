#!/usr/bin/env node
// Proves the signup path works: solves the live proof-of-work, POSTs a real
// address to production, then reads the row back out of Mongo. Exits non-zero
// on any failure so it can't quietly "look fine".
import { createHash } from "crypto";
import { execFileSync } from "child_process";

const EMAIL = `probe+${Date.now()}@skopnix.com`;
const lz = (h) => { let b = 0; for (const ch of h) { const v = parseInt(ch, 16); if (v === 0) { b += 4; continue; } b += Math.clz32(v) - 28; break; } return b; };

const chal = await (await fetch("https://skopnix.com/api/challenge")).json();
let nonce = 0;
while (lz(createHash("sha256").update(`${chal.c}:${nonce}`).digest("hex")) < chal.d) nonce++;

const res = await fetch("https://skopnix.com/api/waitlist", {
  method: "POST",
  headers: { "content-type": "application/json", "x-pow": `${chal.c}.${chal.t}.${chal.s}.${nonce}` },
  body: JSON.stringify({ email: EMAIL, source: "verify" }),
});
const body = await res.text();
console.log(`  POST /api/waitlist -> ${res.status} ${body}`);
if (res.status !== 200) { console.error("  ✗ endpoint still not storing"); process.exit(1); }

// Read it back through the independent read-only credential.
const py = "/Users/fredalex/Desktop/carbanak/claude-test/ctiaze-engine/.venv/bin/python";
const uri = execFileSync("bash", ["-lc",
  "grep -o 'MONGO_URI_READONLY=.*' /Users/fredalex/Desktop/carbanak/claude-test/ctiaze-web/.env.local | cut -d= -f2-"],
  { encoding: "utf8" }).trim();
const out = execFileSync(py, ["-c", `
import sys
from pymongo import MongoClient
col = MongoClient(sys.argv[1], serverSelectionTimeoutMS=8000)["ctiaze"]["signups"]
doc = col.find_one({"email": sys.argv[2]})
print("FOUND" if doc else "MISSING", "| total:", col.count_documents({}))
`, uri, EMAIL], { encoding: "utf8" }).trim();
console.log(`  mongo readback: ${out}`);
if (!out.startsWith("FOUND")) { console.error("  ✗ stored nothing"); process.exit(1); }
console.log(`  ✓ signups are being saved (test row ${EMAIL} — delete from /admin)`);
