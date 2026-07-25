import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Called by the live-update banner's refresh button — marks the feed (and
// the about page, which also surfaces live totals) stale so the very next
// visit gets a fresh server render instead of the cached ISR output.
export async function POST() {
  revalidatePath("/");
  revalidatePath("/haqqinda");
  return NextResponse.json({ revalidated: true });
}
