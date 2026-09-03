import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { writeDb } from "@/lib/db-write";

export const revalidate = 0;

// Visit beacon. Pages are served statically from the CDN, so they never reach
// our code — without an explicit beacon there is nothing to count. Kept
// deliberately cheap because the database is on the free tier:
//   * one row per visit, no sessions, no fingerprinting
//   * per-IP rate limit so a refresh loop can't flood the collection
//   * a TTL index expires rows after 30 days, so this can never grow unbounded
const TTL_DAYS = 30;
let ttlEnsured = false;

export async function POST(req: Request) {
  // 30/min is generous for a human and cheap for us.
  if (!rateLimit(`hit:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: true }); // silently drop; never error a beacon
  }
  const db = writeDb();
  if (!db) return NextResponse.json({ ok: true });

  let path = "/";
  let ref = "";
  let src = "";
  try {
    const body = (await req.json()) as { path?: unknown; ref?: unknown; src?: unknown };
    path = String(body.path ?? "/").slice(0, 200);
    ref = String(body.ref ?? "").slice(0, 200);
    src = String(body.src ?? "").slice(0, 40);
  } catch {
    /* beacon with no body is still a visit */
  }

  try {
    const d = await db;
    const col = d.collection("visits");
    if (!ttlEnsured) {
      await col.createIndex({ at: 1 }, { expireAfterSeconds: TTL_DAYS * 86400 }).catch(() => {});
      ttlEnsured = true;
    }
    await col.insertOne({
      at: new Date(),
      ip: clientIp(req),
      country: req.headers.get("x-vercel-ip-country") || null,
      city: req.headers.get("x-vercel-ip-city") || null,
      host: req.headers.get("host") || null,
      path,
      ref: ref || null,
      src: src || null,
      ua: (req.headers.get("user-agent") || "").slice(0, 200),
    });
  } catch {
    /* analytics must never break a page */
  }
  return NextResponse.json({ ok: true });
}
