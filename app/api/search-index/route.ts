import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/stories";

export async function GET() {
  const index = await getSearchIndex();
  return NextResponse.json(index);
}
