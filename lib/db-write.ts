import { MongoClient, type Db } from "mongodb";

// Server-only WRITE connection for user-submitted data (the early-access
// waitlist and the visit beacon). This is a SEPARATE credential from the
// read-only reader in lib/db.ts: set MONGO_URI_WRITE to a write-capable Atlas
// user scoped to this database. If it's absent the waitlist degrades gracefully
// — returns "not open yet" — and never crashes the build or any other route.
//
// MONGO_DB: see the note in lib/db.ts. Keep the database named `ctiaze`.
declare global {
  var _mongoWritePromise: Promise<MongoClient> | undefined;
}

const DB_NAME = process.env.MONGO_DB || "ctiaze";

let promise: Promise<MongoClient> | null = null;

export function writeDb(): Promise<Db> | null {
  const uri = process.env.MONGO_URI_WRITE;
  if (!uri) return null;
  if (!promise) {
    // Same rule as lib/db.ts: a rejected connection must not be cached, or one
    // unreachable moment during a cluster move turns into "this instance can
    // never write again" — silently, because the waitlist route reports the
    // same friendly 503 whether the variable is missing or the cluster is down.
    const cached = global._mongoWritePromise;
    if (cached) {
      promise = cached;
    } else {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      const p = client.connect();
      p.catch(() => {
        void client.close().catch(() => {});
        if (promise === p) promise = null;
        if (global._mongoWritePromise === p) global._mongoWritePromise = undefined;
      });
      promise = p;
    }
    if (process.env.NODE_ENV !== "production") global._mongoWritePromise = promise;
  }
  return promise.then((c) => c.db(DB_NAME));
}
