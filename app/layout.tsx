import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { IntroSplash } from "@/components/IntroSplash";
import { CommandPalette } from "@/components/CommandPalette";
import { CustomCursor } from "@/components/CustomCursor";
import "./globals.css";

const headline = Newsreader({
  variable: "--font-headline",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
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
      suppressHydrationWarning
    >
      <head>
        {/* Set theme before paint to avoid a flash of the wrong theme. Dark is
            the CSS default (see globals.css) — this only ever needs to add
            data-theme="light", never "dark". */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(!t&&window.matchMedia('(prefers-color-scheme: light)').matches){t='light';}if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface text-ink-primary font-body antialiased">
        <IntroSplash />
        <CommandPalette />
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
