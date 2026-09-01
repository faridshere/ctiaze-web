import { MongoClient, type Db } from "mongodb";

// Server-only WRITE connection for user-submitted data (the early-access
// waitlist). This is a SEPARATE credential from the read-only pipeline reader in
// lib/db.ts: set MONGO_URI_WRITE to a write-capable Atlas user (scope it to the
// `signups` collection). If it's absent the waitlist degrades gracefully —
// returns "not open yet" — and never crashes the build or any other route.
declare global {
  var _mongoWritePromise: Promise<MongoClient> | undefined;
}

let promise: Promise<MongoClient> | null = null;

export function writeDb(): Promise<Db> | null {
  const uri = process.env.MONGO_URI_WRITE;
  if (!uri) return null;
  if (!promise) {
    promise =
      global._mongoWritePromise ??
      new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect();
    if (process.env.NODE_ENV !== "production") global._mongoWritePromise = promise;
  }
  return promise.then((c) => c.db("ctiaze"));
}
