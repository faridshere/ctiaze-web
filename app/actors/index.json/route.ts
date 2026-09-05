import { NextResponse } from "next/server";
import { getActorsPageData } from "@/lib/threatactors";

// The whole roster's search index, as one static file: id/name/type/origin/
// aliases only, alphabetical, nothing invented. ActorSearch fetches this ONCE
// per session (not a function call per keystroke) and filters client-side —
// the roster is a few hundred rows, small enough to ship whole and cheap
// enough for the CDN to hold for an hour.
export const revalidate = 3600;

export async function GET() {
  const data = await getActorsPageData();
  return NextResponse.json(
    { generatedAt: new Date().toISOString(), actors: data.index },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
