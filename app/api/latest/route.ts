import { NextResponse } from "next/server";
import { getLatestSignal } from "@/lib/stories";

// Route Handlers are uncached by default — every request hits the DB fresh,
// which is the whole point of a poll target.
export async function GET() {
  const signal = await getLatestSignal();
  return NextResponse.json(signal);
}
