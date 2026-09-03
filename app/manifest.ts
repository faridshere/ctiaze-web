import type { MetadataRoute } from "next";

// Web app manifest — most visitors arrive from a Telegram post on a phone, and
// without this "Add to Home Screen" has no name, no icon and no theme. Also sets
// the mobile browser UI colour so the address bar matches the site's ground.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "skopnix — see it, nix it",
    short_name: "skopnix",
    description: "The world's cyber threats, read straight off the wire.",
    start_url: "/",
    display: "standalone",
    background_color: "#05060a",
    theme_color: "#0a0b0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
