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
  // /radar (static console) and /apt (redundant with /actors) removed in the
  // skopnix cleanup — 301 old URLs to the closest live page. Going global, the
  // Azerbaijani route slugs were renamed to English; 301 the old ones so
  // bookmarks, backlinks and indexed URLs keep resolving.
  async redirects() {
    return [
      { source: "/radar", destination: "/exposure", permanent: true },
      { source: "/radar.html", destination: "/exposure", permanent: true },
      { source: "/apt", destination: "/actors", permanent: true },
      // AZ slug → English slug
      { source: "/haqqinda", destination: "/about", permanent: true },
      { source: "/hucum", destination: "/attacks", permanent: true },
      { source: "/hucum/:slug", destination: "/attacks/:slug", permanent: true },
      { source: "/sektor", destination: "/sectors", permanent: true },
      { source: "/sektor/:slug", destination: "/sectors/:slug", permanent: true },
      { source: "/lugat", destination: "/glossary", permanent: true },
      { source: "/lugat/:slug", destination: "/glossary/:slug", permanent: true },
      { source: "/metodologiya", destination: "/about", permanent: true },
      { source: "/veziyyet", destination: "/situation", permanent: true },
      { source: "/xeber/:slug", destination: "/news/:slug", permanent: true },
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
