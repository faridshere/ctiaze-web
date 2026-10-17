import type { Metadata, Viewport } from "next";
import { Archivo, Hepta_Slab, IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { MotionRoot } from "@/components/MotionRoot";
import { HitBeacon } from "@/components/HitBeacon";
import { EditionReplay } from "@/components/site/EditionReplay";
import { SITE_NAME, SITE_URL, LINKS, SOURCE_COUNT } from "@/lib/site";
import "./globals.css";

// Type system (v4 "Late Edition", 2026-10-16). Four files, all self-hosted by
// next/font so the CSP stays 'self' and no runtime CDN is involved:
//   Hepta Slab      the headline voice: a variable Clarendon (wght 1–900), the
//                   kind of slab a broadsheet sets its front page in. Its
//                   weight axis is the only type on the site that moves.
//   Archivo         body AND labels from one variable file: 100% width for
//                   running text, 75% (condensed) for kickers, datelines, nav
//                   and table heads: the newspaper secret.
//   IBM Plex Mono   every number, time, count, CVE id and delta, tabular with
//                   a slashed zero.
//   Schibsted Grotesk 700, the wordmark's face, untouched: "skopnix" is one
//                   word in one weight and is the same on every page.
// Font bill (measured on the 2026-10-16 build): every subset of every face
// is preloaded, so latin only, no italics, one mono weight. Diacritics in an
// actor or place name fall back to the system face for that glyph.
const hepta = Hepta_Slab({
  variable: "--font-hepta",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — global cyber-threat intelligence`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    `Global cyber-threat intelligence, read straight off the wire: ${SOURCE_COUNT} sources, AI-scored and grounded to the original report, every exploited CVE tied to the adversaries that use it, with a weekly internet-exposure census of the Caucasus and Central Asia — refreshed around the clock.`,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  alternates: {
    types: {
      "application/rss+xml": [{ url: LINKS.rss, title: `${SITE_NAME} — RSS` }],
      "application/feed+json": [{ url: LINKS.jsonFeed, title: `${SITE_NAME} — JSON Feed` }],
    },
  },
};

// Two editions of one paper: the browser chrome follows whichever is printing.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a08" },
  ],
  colorScheme: "light dark",
};

// Runs before first paint: a reader who picked an edition in the masthead keeps
// it, from localStorage, with no cookie (every page stays ISR) and no flash.
// Anything else leaves the attribute off and prefers-color-scheme decides.
// EditionReplay covers the one path where this never runs (see that file).
const EDITION_SCRIPT =
  "try{var e=localStorage.getItem('skopnix.edition');if(e==='day'||e==='night'){document.documentElement.setAttribute('data-edition',e)}}catch(_){}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${hepta.variable} ${archivo.variable} ${plex.variable} ${schibsted.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EDITION_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-paper font-body text-ink antialiased">
        {/*
          DIRECTION CONTRACT (v4 "Late Edition", seed: panel-2026-10-16/broadsheet)
          THESIS: a threat wire set as a live broadsheet, refusing the dark
          glowing dashboard every CTI site ships. OWN-WORLD: warm newsprint by
          day, warm black stock by night; Hepta Slab headlines, condensed
          Archivo labels, Plex Mono figures; hierarchy by 1px/2px/double rules
          and column hairlines; stamp red for KEV; orange only in the logo and
          the one live dot. STORY: a reader sees the newest exploited CVE as a
          front-page lead, the wire ticking beside it with real archive
          ordinals, and leaves with Telegram/RSS/JSON in hand. FIRST VIEWPORT:
          40px black tape (clock, newest dispatch, edition number), a three-rule
          nameplate with the untouched logo centred and the 24h dial right, the
          lead in columns 1–7, THE WIRE in 9–12 behind a 1px rule, the index
          strip under the lead. FORM: editorial broadsheet, first of five
          directions by three judges. FINISH: unreviewed and undocumented is
          unfinished; this build ends with the finish review, the verdict,
          DESIGN.md, and every shipping raster carrying its provenance.
        */}
        <a
          href="#main"
          className="label sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <EditionReplay />
        <MotionRoot />
        <HitBeacon />
        {children}
      </body>
    </html>
  );
}
