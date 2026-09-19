import { MongoClient, type Db } from "mongodb";

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
//
// The database name is `ctiaze` and stays so through the skopnix rebrand — the
// pipeline, the ops batches and both backup scripts all hardcode it. MONGO_DB
// exists only so a migration can point at a differently-named database without
// a code change; if you set it here you must set it for the engine too.
const DB_NAME = process.env.MONGO_DB || "ctiaze";

// Cache the connection across invocations in the same warm serverless instance
// (the standard Next.js + MongoDB pattern) instead of reconnecting per request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

// Connect, and — the part that matters — never leave a REJECTED promise in the
// cache. The previous version called client.connect() once at module scope and
// awaited that same promise forever: an instance that booted during an eight-
// second window when Atlas was unreachable (a cluster cutover, a new IP access
// list, an SRV record still propagating) served every later request from the
// cached rejection, so the landing page fell back to its empty state and every
// API route answered 503 until that instance was recycled. On a container host
// that is "until someone restarts it". Now a failed attempt clears itself and
// the next request reconnects.
function connect(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI_READONLY;
  if (!uri) {
    throw new Error(
      "MONGO_URI_READONLY is not set. This must be a read-only database user — " +
        "never reuse the pipeline's read-write credential here."
    );
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  const p = client.connect();
  p.catch(() => {
    void client.close().catch(() => {});
    if (clientPromise === p) clientPromise = null;
    if (global._mongoClientPromise === p) global._mongoClientPromise = undefined;
  });
  return p;
}

// Throws on the first CALL rather than on import. Importing this module used to
// throw when the variable was absent, which is why lib/actor-match.ts,
// lib/wire-select.ts and lib/stix.ts were split out of their data modules — and
// why the repo could not be built or booted at all without the production
// credential. A clone can now run `npm run dev`; only the data-backed routes
// fail, at request time, with this message.
export async function getDb(): Promise<Db> {
  if (!clientPromise) {
    clientPromise = global._mongoClientPromise ?? connect();
    if (process.env.NODE_ENV !== "production") {
      global._mongoClientPromise = clientPromise;
    }
  }
  const c = await clientPromise;
  return c.db(DB_NAME);
}
