import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Called by the live-update banner's refresh button — marks the feed (and the
// about page, which also surfaces live totals) stale so the next visit gets a
// fresh server render. It's an unauthenticated public button by nature (a real
// user click), so it can't carry a secret; instead it's rate-limited to blunt
// the cache-bust/DoS-amplification the pentest flagged. Worst case per allowed
// call is a re-render off the read-only Mongo replica — no data risk.
export async function POST(req: Request) {
  if (!rateLimit(`reval:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ revalidated: false, error: "rate_limited" }, { status: 429 });
  }
  revalidatePath("/");
  revalidatePath("/about");
  return NextResponse.json({ revalidated: true });
}
