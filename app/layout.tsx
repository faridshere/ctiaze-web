import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CommandPalette } from "@/components/CommandPalette";
import "./globals.css";

// Xəzər Standard type system: Archivo (product grotesk) for display, Inter for
// UI/body, JetBrains Mono for all data/evidence. All three load latin + latin-
// ext so Azerbaijani ə (U+0259) renders correctly.
const headline = Archivo({
  variable: "--font-headline",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="az"
      className={`${headline.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-surface text-ink-primary font-body antialiased">
        <CommandPalette />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
