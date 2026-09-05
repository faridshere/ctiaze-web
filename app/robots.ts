import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/site";

// The public surface is the landing page and the story pages the Telegram
// channel links to. Everything else was shelved under app/_disabled and no
// longer exists as a route, so it needs no Disallow — only /admin does.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/news/", "/actors/"], disallow: ["/admin", "/api/"] },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/news/", "/actors/"],
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: [absoluteUrl("/sitemap.xml"), absoluteUrl("/news-sitemap.xml")],
    host: SITE_URL,
  };
}
