import { NextResponse } from "next/server";
import { ADMIN_COOKIE, tokenIsValid, newSessionValue } from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const revalidate = 0;

// Exchange the admin token for a session cookie. Tightly rate-limited: this is
// the one endpoint where guessing gets you the email list.
export async function POST(req: Request) {
  if (!rateLimit(`adminlogin:${clientIp(req)}`, 5, 300_000)) {
    return NextResponse.json({ error: "Too many attempts — wait a few minutes." }, { status: 429 });
  }
  let token = "";
  try {
    token = String(((await req.json()) as { token?: unknown })?.token ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const session = newSessionValue();
  if (!session || !tokenIsValid(token)) {
    // Same response either way: never reveal whether ADMIN_TOKEN is even set.
    return NextResponse.json({ error: "Wrong token." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

// Sign out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
