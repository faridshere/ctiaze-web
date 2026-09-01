import { NextResponse } from "next/server";
import { issueChallenge } from "@/lib/pow";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const revalidate = 0;

// Hands out a short-lived signed proof-of-work challenge. Bounded per IP so the
// challenge itself can't be used to spin the CPU.
export async function GET(req: Request) {
  if (!rateLimit(`chal:${clientIp(req)}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return NextResponse.json(issueChallenge(), { headers: { "Cache-Control": "no-store" } });
}
