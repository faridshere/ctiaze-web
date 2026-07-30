import type { MetadataRoute } from "next";

// Allow everything + explicitly welcome the AI answer-engines (reinforces the
// hand-authored llms.txt / generative-engine-optimization intent).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/" },
    ],
    sitemap: "https://ctiaze.tech/sitemap.xml",
    host: "https://ctiaze.tech",
  };
}
