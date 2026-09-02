import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CommandPalette } from "@/components/CommandPalette";
import { MotionRoot } from "@/components/MotionRoot";
import { HitBeacon } from "@/components/HitBeacon";
import { LocaleProvider } from "@/components/locale";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

// Type system (2026-09): Schibsted Grotesk — one nonchalant grotesque for the
// wordmark, headlines and body alike; JetBrains Mono — ALL telemetry (timestamps,
// glyph codes, tickers, CVE/IOC values). latin-ext kept so actor names and
// place names with diacritics render cleanly. next/font self-hosts woff2 from
// our origin: no runtime CDN, no per-OS fallback drift.
const headline = Schibsted_Grotesk({
  variable: "--font-headline",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

const body = Schibsted_Grotesk({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

// Schibsted Grotesk as the skopnix brand voice (hero + wordmark), applied via
// font-display; one family unifies every headline and the mark.
const display = Schibsted_Grotesk({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://skopnix.com"),
  title: {
    default: "skopnix — global cyber-threat intelligence",
    template: "%s — skopnix",
  },
  description:
    "Global cyber-threat intelligence as an API and MCP server. ~60 sources, AI-scored and verified, with sensor-backed coverage of the Caucasus and Central Asia — refreshed every couple of hours, no human in the loop.",
  openGraph: {
    type: "website",
    siteName: "skopnix",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "skopnix — RSS" }],
      "application/feed+json": [{ url: "/feed.json", title: "skopnix — JSON Feed" }],
    },
  },
};

// The screen identity is always the dark ink register (light is print-only),
// so the browser chrome is dark on every device — no per-page/per-OS colour drift.
export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${headline.variable} ${body.variable} ${mono.variable} ${display.variable}`}
    >
      <body className="min-h-screen bg-surface text-ink-primary font-body antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-sm focus:bg-brand focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:font-semibold focus:text-[#07110e]"
        >
          Skip to content
        </a>
        <LocaleProvider value={locale}>
          <MotionRoot />
        <HitBeacon />
          <CommandPalette />
          {children}
          <Analytics />
        </LocaleProvider>
      </body>
    </html>
  );
}
