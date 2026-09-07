import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/site";

// The public surface is the landing page, the archive, the dossiers and the
// CVE hubs. Everything else was shelved under app/_disabled and no longer
// exists as a route, so it needs no Disallow.
//
// /admin is deliberately NOT listed: robots.txt is public, nothing links to
// the page, and it is absent from both sitemaps — naming it here was the only
// thing telling a crawler (or an attacker reading robots.txt first, as they
// do) that it exists. The page itself fails closed and sends no-store.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/news/", "/actors/"], disallow: ["/api/"] },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/news/", "/actors/"],
        disallow: ["/api/"],
      },
    ],
    sitemap: [absoluteUrl("/sitemap.xml"), absoluteUrl("/news-sitemap.xml")],
    host: SITE_URL,
  };
}
