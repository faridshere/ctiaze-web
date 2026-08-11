import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CommandPalette } from "@/components/CommandPalette";
import { LocaleProvider } from "@/components/locale";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

// Növbə type system: the IBM Plex superfamily IS the identity — one voice, three
// weights of it. Plex Sans Condensed for display (the ledger's condensed
// headlines), Plex Sans for Azerbaijani prose, Plex Mono for ALL telemetry
// (timestamps, glyph codes, tickers, CVE/IOC values). next/font self-hosts the
// woff2 from our own origin (no runtime CDN) and ships the SAME files to every
// OS — removing the per-device font-fallback drift that made the old site look
// different on PC/iPhone/Android. latin-ext pins Azerbaijani ə (U+0259).
const headline = IBM_Plex_Sans_Condensed({
  variable: "--font-headline",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ctiaze.tech"),
  title: {
    default: "ctiaze — Azərbaycan kiber-təhlükə kəşfiyyatı",
    template: "%s — ctiaze",
  },
  description:
    "Avtomatlaşdırılmış kiber-təhlükə kəşfiyyatı jurnalı. Süni intellekt vasitəsilə seçilir, yoxlanılır və Azərbaycan dilinə tərcümə olunur — 24/7, insan müdaxiləsi olmadan.",
  openGraph: {
    type: "website",
    siteName: "ctiaze",
    locale: "az_AZ",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "ctiaze — RSS" }],
      "application/feed+json": [{ url: "/feed.json", title: "ctiaze — JSON Feed" }],
    },
  },
};

// The screen identity is always the dark asphalt register (light is print-only),
// so the browser chrome is dark on every device — no per-page/per-OS colour drift.
export const viewport: Viewport = {
  themeColor: "#141210",
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
      className={`${headline.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-surface text-ink-primary font-body antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-sm focus:bg-brand focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:font-semibold focus:text-[#07110e]"
        >
          {locale === "en" ? "Skip to content" : "Əsas məzmuna keç"}
        </a>
        <LocaleProvider value={locale}>
          <CommandPalette />
          {children}
          <Analytics />
        </LocaleProvider>
      </body>
    </html>
  );
}
