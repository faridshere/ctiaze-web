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
  // skopnix cleanup — 301 old URLs to the closest live page.
  async redirects() {
    return [
      { source: "/radar", destination: "/exposure", permanent: true },
      { source: "/radar.html", destination: "/exposure", permanent: true },
      { source: "/apt", destination: "/actors", permanent: true },
    ];
  },
};

export default nextConfig;
