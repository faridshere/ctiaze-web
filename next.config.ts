import type { NextConfig } from "next";

// Security headers (flagged by the pentest review). CSP keeps 'unsafe-inline'
// for scripts/styles because Next injects un-nonced inline bootstrap + styles;
// XSS risk is low (content is from the trusted pipeline, results are structured
// data React-escapes), and the policy still locks down connect/img/frame/base/
// form. Vercel Analytics is self-hosted (/_vercel/insights/script.js → 'self')
// and beacons to vitals.vercel-insights.com (connect-src).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Two jobs here, in priority order:
  //
  // 1. STORY RESCUE — every Telegram post ever published links a story URL, and
  //    those posts can't be edited in bulk. Pre-rebrand posts link
  //    ctiaze.tech/xeber/<slug>. The old generic /xeber rewrite was *relative*,
  //    so on ctiaze.tech it landed on ctiaze.tech/news/<slug> — which the host
  //    rewrite below then swallowed into the placeholder. Cross-domain 308s
  //    send that whole archive of inbound links to the real story on
  //    skopnix.com, where the email form is.
  //
  // 2. SHELVED SECTIONS — everything moved to app/_disabled 404s now. Humans
  //    arriving from old links/bookmarks/search results get the landing page
  //    instead of a dead end. Deliberately permanent:false (307): these
  //    sections are coming back, and a 308 would be cached forever by browsers
  //    and search engines, hijacking the URLs even after relaunch.
  async redirects() {
    const ctiazeHosts = ["ctiaze.tech", "www.ctiaze.tech"];
    const storyRescue = ctiazeHosts.flatMap((value) => [
      {
        source: "/xeber/:slug",
        has: [{ type: "host" as const, value }],
        destination: "https://skopnix.com/news/:slug",
        permanent: true,
      },
      {
        source: "/news/:slug",
        has: [{ type: "host" as const, value }],
        destination: "https://skopnix.com/news/:slug",
        permanent: true,
      },
    ]);

    // Shelved product sections plus their legacy AZ-era aliases. ":path*"
    // matches the bare section and any depth beneath it.
    const shelved = [
      "cve", "vendor", "sectors", "attacks", "glossary", "scan-me",
      "ioc", "exposure", "situation", "stacknix", "developers", "pricing",
      "methodology", "radar", "hucum", "sektor", "lugat", "veziyyet",
    ].map((seg) => ({ source: `/${seg}/:path*`, destination: "/", permanent: false }));

    return [
      ...storyRescue,
      // still-alive renames keep their permanent redirects
      { source: "/haqqinda", destination: "/about", permanent: true },
      { source: "/metodologiya", destination: "/about", permanent: true },
      { source: "/xeber/:slug", destination: "/news/:slug", permanent: true },
      { source: "/radar.html", destination: "/", permanent: false },
      // the old APT atlas lives inside the adversaries section now
      { source: "/apt", destination: "/actors", permanent: true },
      { source: "/apt/:path*", destination: "/actors", permanent: true },
      ...shelved,
    ];
  },

  // ctiaze.tech is retired as a product surface — the site lives on skopnix.com.
  // Everything that domain serves is the single placeholder screen (globe + an
  // email field). Done as a host rewrite rather than middleware so it costs no
  // per-request invocation, and in beforeFiles so it wins over the filesystem.
  // The negative lookahead keeps the page's own JS/CSS, the API routes and the
  // metadata files reachable — without it the rewrite would swallow /_next/* and
  // the page would render unstyled.
  async rewrites() {
    const hosts = ["ctiaze.tech", "www.ctiaze.tech"];
    return {
      beforeFiles: hosts.map((value) => ({
        source: "/((?!_next/|api/|coming-soon).*)",
        has: [{ type: "host" as const, value }],
        destination: "/coming-soon",
      })),
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
