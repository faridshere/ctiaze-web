import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
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
        {/* Set theme before paint to avoid a flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface text-ink-primary font-body antialiased">
        {children}
      </body>
    </html>
  );
}
