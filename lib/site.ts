// The one place the site's identity lives: canonical origin, outbound links and the
// public feeds. Every route, feed and share card imports from here so a rename
// (ctiaze → skopnix taught us) is a one-line change, not a grep across the tree.
export const SITE_URL = "https://skopnix.com";
export const SITE_NAME = "skopnix";
export const SITE_TAGLINE = "The world's cyber threats, read straight off the wire.";

// Public profiles that belong to the same entity. `sameAs` in the Organization
// schema is how a search engine resolves "skopnix" to a real thing rather than
// guessing it is a misspelling of some other product — which is exactly what
// Google's AI Overview was doing (it offered "Skopx" and "Scopix" instead).
export const SAME_AS: string[] = [
  "https://t.me/skopnix",
];

export const LINKS = {
  telegram: "https://t.me/skopnix",
  email: "mailto:hello@skopnix.com",
  rss: "/rss.xml",
  jsonFeed: "/feed.json",
  llms: "/llms.txt",
} as const;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function storyUrl(slug: string): string {
  return absoluteUrl(`/news/${slug}`);
}
