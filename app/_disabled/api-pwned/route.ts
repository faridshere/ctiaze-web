import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Pwned-password check via HIBP's k-anonymity range API. The browser SHA-1s the
// password and sends ONLY the first 5 hex chars of the hash here; we proxy that
// prefix to api.pwnedpasswords.com and return the suffix list for the browser to
// match locally. The password — and even its full hash — never reach this server.
export const revalidate = 0;

export async function GET(req: Request) {
  if (!rateLimit(`pwned:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests — wait a minute" }, { status: 429 });
  }
  const prefix = (new URL(req.url).searchParams.get("prefix") || "").toUpperCase();
  if (!/^[0-9A-F]{5}$/.test(prefix)) {
    return NextResponse.json({ error: "Invalid prefix" }, { status: 400 });
  }
  try {
    const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "User-Agent": "skopnix.com scan-me", "Add-Padding": "true" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    const text = await r.text();
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain", "Cache-Control": "public, s-maxage=86400" },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
