import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { MotionRoot } from "@/components/MotionRoot";
import { HitBeacon } from "@/components/HitBeacon";
import { SITE_NAME, SITE_URL, LINKS } from "@/lib/site";
import "./globals.css";

// Type system: ONE grotesque (Schibsted) for the wordmark, headlines and body —
// exposed as --font-display / --font-headline / --font-body in globals.css so
// every surface, live or shelved, resolves to the same face — and JetBrains
// Mono for all chrome and telemetry. next/font self-hosts the woff2 from our
// origin: no runtime CDN, no per-OS fallback drift. latin-ext keeps actor and
// place names with diacritics clean.
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — global cyber-threat intelligence`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Global cyber-threat intelligence, read straight off the wire: ~60 sources, AI-scored and grounded to the original report, with sensor-backed coverage of the Caucasus and Central Asia — refreshed around the clock.",
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  alternates: {
    types: {
      "application/rss+xml": [{ url: LINKS.rss, title: `${SITE_NAME} — RSS` }],
      "application/feed+json": [{ url: LINKS.jsonFeed, title: `${SITE_NAME} — JSON Feed` }],
    },
  },
};

// The screen identity is always the dark ink register (light is print-only),
// so the browser chrome is dark on every device.
export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${schibsted.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-surface font-body text-ink-primary antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-[var(--radius-btn)] focus:bg-brand focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:font-semibold focus:text-[#170a03]"
        >
          Skip to content
        </a>
        <MotionRoot />
        <HitBeacon />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
