import { NextResponse, type NextRequest } from "next/server";

// First-visit locale default from geo: Azerbaijan → Azerbaijani, elsewhere →
// English. Missing/unknown country stays Azerbaijani (this is an AZ-first product).
// Only sets the cookie when absent, so the header toggle always wins afterwards.
export function proxy(req: NextRequest) {
  // ?dil=az|en forces the locale for THIS request (overriding cookie/geo). This is
  // what makes the site crawlable in both languages: a cookieless crawler from a US
  // IP would otherwise always get the English render, so the Azerbaijani content
  // (the unique, rankable long-tail) never enters the index. hreflang points Google
  // at ?dil=az / ?dil=en, and each serves a fixed language. Humans clicking such a
  // link switch + persist too.
  const dil = req.nextUrl.searchParams.get("dil");
  const forced = dil === "az" || dil === "en" ? dil : null;
  if (!forced && req.cookies.get("locale")) return NextResponse.next();
  const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const locale = forced || (country && country !== "AZ" ? "en" : "az");
  // Set it on the REQUEST too so this very first render already sees the right
  // locale (otherwise a non-AZ visitor's first paint is Azerbaijani until reload).
  req.cookies.set("locale", locale);
  const res = NextResponse.next({ request: req });
  res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

// Skip machine/cacheable surfaces: locale is meaningless there, and a Set-Cookie
// on them defeats Vercel's edge cache for cookieless clients (feed pollers, crawlers,
// AI agents) — exactly the audience feed.json/llms.txt/rss target — punching their
// s-maxage headers straight through to origin/Mongo on every hit.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|news-sitemap.xml|api/|feed.json|rss.xml|llms.txt|opengraph-image|icon.svg).*)",
  ],
};
