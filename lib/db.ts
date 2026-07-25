import { MongoClient } from "mongodb";

// Server-only: never imported by a Client Component, so this connection string
// (a dedicated READ-ONLY user — see README) never reaches the browser bundle.
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
