import type { MetadataRoute } from "next";

// The public surface is the landing page and the story pages the Telegram
// channel links to. Everything else was shelved under app/_disabled and no
// longer exists as a route, so it needs no Disallow — only /admin does.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/news/"], disallow: ["/admin", "/api/"] },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/news/"],
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: ["https://skopnix.com/sitemap.xml", "https://skopnix.com/news-sitemap.xml"],
    host: "https://skopnix.com",
  };
}
