import type { MetadataRoute } from "next";

// Allow everything + explicitly welcome the AI answer-engines (reinforces the
// hand-authored llms.txt / generative-engine-optimization intent).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/" },
    ],
    sitemap: ["https://skopnix.com/sitemap.xml", "https://skopnix.com/news-sitemap.xml"],
    host: "https://skopnix.com",
  };
}
