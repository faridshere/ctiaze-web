import { NextResponse, type NextRequest } from "next/server";

// First-visit locale default from geo: Azerbaijan → Azerbaijani, elsewhere →
// English. Missing/unknown country stays Azerbaijani (this is an AZ-first product).
// Only sets the cookie when absent, so the header toggle always wins afterwards.
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("locale")) {
    const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
    const locale = country && country !== "AZ" ? "en" : "az";
    res.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
