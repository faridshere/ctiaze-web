import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { verifyPow } from "@/lib/pow";
import { writeDb } from "@/lib/db-write";

export const revalidate = 0;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Early-access signups. Same invisible proof-of-work gate as the tools, so a
// script can't stuff the list, plus a tight per-IP limit. Stored deduped by
// email in the `signups` collection.
export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many requests — wait a minute" }, { status: 429 });
  }
  if (!verifyPow(req.headers.get("x-pow"))) {
    return NextResponse.json({ error: "Couldn't verify the request — refresh and try again." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const email = String(b.email ?? "").trim().toLowerCase();
  const source = String(b.source ?? "site").slice(0, 40);
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const db = writeDb();
  if (!db) {
    return NextResponse.json(
      { error: "Early access isn't open just yet — check back soon." },
      { status: 503 }
    );
  }

  try {
    const col = (await db).collection("signups");
    const ua_hash = createHash("sha256")
      .update((req.headers.get("user-agent") || "") + "|" + clientIp(req))
      .digest("hex")
      .slice(0, 16);
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
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Couldn't save right now — try again shortly." }, { status: 500 });
  }
}
