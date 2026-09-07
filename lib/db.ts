import { MongoClient } from "mongodb";

// Server-only: never imported by a Client Component, so this connection string
// never reaches the browser bundle.
//
// ⚠ 2026-09-07: a pentest found this variable holding the PIPELINE'S atlasAdmin
// superuser — same user, same password as the engine's MONGO_URI — while the
// comment here claimed the opposite. atlasAdmin can drop any collection in the
// project, so any env disclosure on this PUBLIC website was cluster-wide.
// Remediation is in docs/HANDOVER-2026-09-07.md and requires the Atlas console;
// scripts/check-db-privileges.mjs asserts it, and the health check runs it, so
// the claim in this comment is now verified rather than asserted.
const uri = process.env.MONGO_URI_READONLY;

if (!uri) {
  throw new Error(
    "MONGO_URI_READONLY is not set. This must be a read-only database user — " +
      "never reuse the pipeline's read-write credential here."
  );
}

// Cache the client across invocations in the same warm serverless instance
// (the standard Next.js + MongoDB pattern) instead of reconnecting per request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 8000,
});

const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  global._mongoClientPromise = clientPromise;
}

export async function getDb() {
  const c = await clientPromise;
  return c.db("ctiaze");
}
