#!/usr/bin/env node
// Asserts that MONGO_URI_READONLY is actually read-only.
//
// This exists because it wasn't. On 2026-09-07 a pentest found the public
// website's "read-only" credential authenticating as atlasAdmin — the same
// user and password as the pipeline's write secret — while lib/db.ts asserted
// in a comment that it was a dedicated read-only user. A comment cannot check
// itself; this can.
//
//   node --env-file=.env.local scripts/check-db-privileges.mjs
//
// Exit 0 = the credential holds read-only roles. Exit 1 = it does not.
import { MongoClient } from "mongodb";

const ALLOWED = new Set(["read", "readAnyDatabase"]);

const uri = process.env.MONGO_URI_READONLY;
if (!uri) {
  console.error("FAIL  MONGO_URI_READONLY is not set");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
try {
  await client.connect();
  const status = await client.db("admin").command({ connectionStatus: 1 });
  const roles = status.authInfo.authenticatedUserRoles ?? [];
  const user = status.authInfo.authenticatedUsers?.[0]?.user ?? "(unknown)";
  const named = roles.map((r) => `${r.role}@${r.db}`).join(", ") || "(none)";
  const over = roles.filter((r) => !ALLOWED.has(r.role));

  if (over.length) {
    console.error(`FAIL  MONGO_URI_READONLY authenticates as "${user}" with [${named}]`);
    console.error(`      Over-privileged role(s): ${over.map((r) => r.role).join(", ")}`);
    console.error("      The public website must hold a credential that can only read.");
    console.error("      Fix: Atlas → Database Access → add a user with role `read` on");
    console.error("      the ctiaze database only, set it as MONGO_URI_READONLY in Vercel,");
    console.error("      then rotate the pipeline user's password. See");
    console.error("      docs/HANDOVER-2026-09-07.md.");
    process.exit(1);
  }
  console.log(`PASS  MONGO_URI_READONLY authenticates as "${user}" with [${named}]`);
} catch (err) {
  console.error(`FAIL  could not verify privileges: ${err.message}`);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
