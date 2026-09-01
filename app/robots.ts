import type { MetadataRoute } from "next";

// Allow everything + explicitly welcome the AI answer-engines, EXCEPT the
// surfaces hidden for the soft launch (the commercial pages + methodology),
// which stay unlinked and out of search until they're switched back on.
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/stacknix", "/developers", "/pricing", "/methodology"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/", disallow },
    ],
    sitemap: ["https://skopnix.com/sitemap.xml", "https://skopnix.com/news-sitemap.xml"],
    host: "https://skopnix.com",
  };
}
