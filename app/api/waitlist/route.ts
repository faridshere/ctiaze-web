import { rateLimit, clientIp } from "@/lib/ratelimit";
import { verifyPow } from "@/lib/pow";
import { writeDb } from "@/lib/db-write";
import { jsonError, jsonOk, readJsonBody, RATE } from "@/lib/api";
import { parseSignup, uaHash } from "@/lib/signup";

export const revalidate = 0;

// Early-access signups. Same invisible proof-of-work gate as the tools, so a
// script can't stuff the list, plus a tight per-IP limit. Stored deduped by
// email in the `signups` collection.
export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, RATE.waitlist.limit, RATE.waitlist.windowMs)) {
    return jsonError(429, "Too many requests — wait a minute");
  }
  if (!verifyPow(req.headers.get("x-pow"))) {
    return jsonError(403, "Couldn't verify the request — refresh and try again.");
  }

  const body = await readJsonBody<unknown>(req);
  if (body === null) return jsonError(400, "Bad request");
  const parsed = parseSignup(body);
  if ("error" in parsed) return jsonError(400, parsed.error);
  const { email, source } = parsed;

  const db = writeDb();
  if (!db) {
    return jsonError(503, "Early access isn't open just yet — check back soon.");
  }

  try {
    const col = (await db).collection("signups");
    const ua_hash = uaHash(req.headers.get("user-agent") || "", clientIp(req));
    await col.updateOne(
      { email },
      {
        $setOnInsert: { email, created_at: new Date() },
        $set: {
          source,
          ua_hash,
          updated_at: new Date(),
          // kept so the dashboard can show where a signup came from
          ip: clientIp(req),
          country: req.headers.get("x-vercel-ip-country") || null,
          city: req.headers.get("x-vercel-ip-city") || null,
          ua: (req.headers.get("user-agent") || "").slice(0, 200),
        },
      },
      { upsert: true }
    );
    return jsonOk({ ok: true });
  } catch {
    return jsonError(500, "Couldn't save right now — try again shortly.");
  }
}
