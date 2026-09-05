import { ADMIN_COOKIE, tokenIsValid, newSessionValue } from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError, jsonOk, readJsonBody, RATE } from "@/lib/api";

export const revalidate = 0;

// Exchange the admin token for a session cookie. Tightly rate-limited: this is
// the one endpoint where guessing gets you the email list.
export async function POST(req: Request) {
  if (!rateLimit(`adminlogin:${clientIp(req)}`, RATE.adminLogin.limit, RATE.adminLogin.windowMs)) {
    return jsonError(429, "Too many attempts — wait a few minutes.");
  }
  const body = await readJsonBody<{ token?: unknown }>(req);
  if (body === null) return jsonError(400, "Bad request");
  const token = String(body.token ?? "");
  const session = newSessionValue();
  if (!session || !tokenIsValid(token)) {
    // Same response either way: never reveal whether ADMIN_TOKEN is even set.
    return jsonError(401, "Wrong token.");
  }
  const res = jsonOk({ ok: true });
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
  const res = jsonOk({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
