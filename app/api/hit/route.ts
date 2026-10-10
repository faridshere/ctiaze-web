import { limitCaller, clientIp, clientGeo } from "@/lib/ratelimit";
import { writeDb } from "@/lib/db-write";
import { jsonOk, readJsonBody, RATE } from "@/lib/api";
import { refHost } from "@/lib/referrer";

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
  const ip = clientIp(req);
  // 30/min is generous for a human and cheap for us.
  if (!limitCaller(req, "hit", RATE.hit.limit, RATE.hit.windowMs)) {
    return jsonOk({ ok: true }); // silently drop; never error a beacon
  }
  const db = writeDb();
  if (!db) return jsonOk({ ok: true });

  // beacon with no body (or malformed JSON) is still a visit — fall back to defaults
  const body = (await readJsonBody<{ path?: unknown; ref?: unknown; src?: unknown }>(req)) ?? {};
  // The beacon is unauthenticated, so treat every field as attacker-supplied:
  // this is the owner's only analytics dataset and anything shaped wrong is
  // noise at best. Values that don't match are dropped, not stored raw.
  const rawPath = String(body.path ?? "/").slice(0, 200);
  const path = /^\/[\w\-./%?=&#]*$/.test(rawPath) ? rawPath : "/";
  // The beacon sends the referrer's HOST only (components/HitBeacon.tsx, by
  // design: no paths or query strings from other sites). This used to accept
  // only a full http(s) URL, so every ref was dropped and all ~2,800 stored
  // visits read "direct" (found 2026-10-10). Accept a bare host, or a URL
  // reduced to its host, and store the host lower-cased.
  const ref = refHost(String(body.ref ?? "").slice(0, 200));
  const rawSrc = String(body.src ?? "").slice(0, 40);
  const src = /^[\w-]{1,40}$/.test(rawSrc) ? rawSrc : "";

  try {
    const d = await db;
    const col = d.collection("visits");
    if (!ttlEnsured) {
      await col.createIndex({ at: 1 }, { expireAfterSeconds: TTL_DAYS * 86400 }).catch(() => {});
      ttlEnsured = true;
    }
    await col.insertOne({
      at: new Date(),
      ip,
      ...clientGeo(req),
      host: req.headers.get("host") || null,
      path,
      ref: ref || null,
      src: src || null,
      ua: (req.headers.get("user-agent") || "").slice(0, 200),
    });
  } catch {
    /* analytics must never break a page */
  }
  return jsonOk({ ok: true });
}
