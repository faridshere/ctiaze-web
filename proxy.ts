import { NextResponse, type NextRequest } from "next/server";

// First-visit locale default from geo: Azerbaijan → Azerbaijani, elsewhere →
// English. Missing/unknown country stays Azerbaijani (this is an AZ-first product).
// Only sets the cookie when absent, so the header toggle always wins afterwards.
export function proxy(req: NextRequest) {
  if (req.cookies.get("locale")) return NextResponse.next();
  const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const locale = country && country !== "AZ" ? "en" : "az";
  // Set it on the REQUEST too so this very first render already sees the right
  // locale (otherwise a non-AZ visitor's first paint is Azerbaijani until reload).
  req.cookies.set("locale", locale);
  const res = NextResponse.next({ request: req });
  res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
