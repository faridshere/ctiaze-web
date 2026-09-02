import { NextResponse } from "next/server";
import { getLatestSignal } from "@/lib/stories";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Poll target for the live-update banner. Rate-limited + short CDN cache so it
// can't be hammered to drive Atlas read load — the 15s edge cache keeps it
// effectively real-time while shielding the DB from direct abuse.
export async function GET(req: Request) {
  if (!rateLimit(`latest:${clientIp(req)}`, 120, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const signal = await getLatestSignal();
  return NextResponse.json(signal, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
  });
}
