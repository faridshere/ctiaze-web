import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { IntroSplash } from "@/components/IntroSplash";
import { CommandPalette } from "@/components/CommandPalette";
import { CustomCursor } from "@/components/CustomCursor";
import { NetworkField } from "@/components/NetworkField";
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
            the CSS default (see globals.css); this only ever needs to apply
            light. Sets the same custom properties as lib/theme.ts's
            applyTheme() directly via inline style (highest-priority in the
            cascade, no dependency on any selector matching correctly) rather
            than only toggling the attribute. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(!t&&window.matchMedia('(prefers-color-scheme: light)').matches){t='light';}if(t==='light'){var r=document.documentElement;var v={"--surface":"#f9f9f7","--surface-raised":"#fcfcfb","--ink-primary":"#0b0b0b","--ink-secondary":"#52514e","--ink-muted":"#898781","--hairline":"#e1e0d9","--border":"rgba(11, 11, 11, 0.1)"};for(var k in v){r.style.setProperty(k,v[k]);}r.setAttribute('data-theme','light');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface text-ink-primary font-body antialiased">
        <NetworkField />
        <IntroSplash />
        <CommandPalette />
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
