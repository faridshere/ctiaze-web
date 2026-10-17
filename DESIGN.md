# skopnix — design system (v4, "Late Edition", 2026-10-16)

skopnix is a broadsheet that is wired into the feed. The archive total is the
edition number on the masthead, THE WIRE is a ruled column that steps down a
row when a dispatch lands, the exposure census is the markets page, the
footer is a colophon. One token set prints two editions of the same paper:
DAY on warm newsprint and NIGHT on warm black stock. Hierarchy is rules,
widths and type: no cards, no shadows, no glow, no gradients, no WebGL.
Every number on the page is real feed data with a source line under it.

Supersedes v3 "orbital wire" (aurora, globe, panels). The logo is untouched:
`components/CtiazeMark.tsx` (the triad, top node orange) and the wordmark
`skop<span class="text-brand">nix</span>` in Schibsted Grotesk 700.

## Tokens (`app/globals.css`)

| token | day | night | role |
|---|---|---|---|
| `--paper` | `#f4f0e6` | `#0b0a08` | page ground |
| `--paper-deep` | `#eae4d6` | `#141210` | the deeper stock: census band, data boxes, file tabs |
| `--ink` | `#15130f` | `#e9e3d3` | text, 1px/2px rules |
| `--ink-2` | `#4a463e` | `#b8b2a2` | body copy, decks |
| `--ink-3` | `#726d62` | `#9a9384` | meta, labels, source lines (AA on both stocks) |
| `--rule-soft` | `#d3ccbb` | `#2a2721` | secondary hairlines, column rules |
| `--tape` / `--tape-ink` | `#0b0a08` / `#e9e3d3` | same | the top tape, black in both editions |
| `--brand` | `#ff5a1f` | same | ONLY the mark's lit node, "nix", the one live dot, focus rings |
| `--stamp` | `#c8102e` | `#ff3b4e` | KEV: the stamp, the double rule, "actively exploited" |
| `--worse` / `--better` | `#b42318` / `#1e7a4a` | `#ff6b5e` / `#6cc98a` | census deltas (up is worse) |
| `--caution` | `#8f6a00` | `#e0b94a` | the rare EPSS warning tag |

Night values apply under `prefers-color-scheme: dark` unless `<html data-edition="day">`,
and always under `data-edition="night"`. The masthead toggle (`EditionToggle`)
writes `localStorage.skopnix.edition`; the root layout's inline script replays it
before paint. No cookie: every page stays ISR. Print is always the day edition.

The v3 names (`--surface`, `--ink-primary`, `--hairline`, `--limb`, `--accent-*`,
`--radius-*`) still resolve, mapped onto the paper, so a page not yet re-set in v4
degrades into the palette instead of breaking. New work uses the v4 names.
Tailwind utilities exist for both: `bg-paper`, `text-ink-3`, `border-rule-soft`,
`text-stamp`, `bg-paper-deep`, `font-display`, `font-mono`, `font-wordmark`.

## Type

| role | face | how |
|---|---|---|
| headline | **Hepta Slab** (variable wght 1–900) | `.headline` 700, lh 0.98, ls −0.02em, `text-wrap: balance`; the lead `clamp(2.6rem, 6.2vw, 5.75rem)` shrinking with title length; section H2 `clamp(1.6rem, 3vw, 2.4rem)`; adversary names `.pressed` 400 → 800 on hover |
| body | **Archivo** at width 100% | 15–17px / 1.55, max 64ch, `--ink-2`; `.deck` 19px for the lead summary |
| label | **Archivo** at width 75% | `.label`: 600, 11.5px, uppercase, ls 0.12em. Kickers, datelines, nav, table heads, buttons |
| figures | **IBM Plex Mono** 400 | every number, time, count, CVE id, delta, curl line; `.num` = tabular, slashed zero |
| wordmark | Schibsted Grotesk 700 | "skopnix" only |

Orange is never text under 24px. Cyan no longer exists.

## Rules, boxes, rows

- `.rule` 1px ink top · `.rule-2` 2px ink · `.rule-soft` 1px soft · `.rule-b`, `.rule-b-2` the same at the bottom · `.oxford` 3px double stamp.
- `.ink-box` 1px ink all round · `.double-box` 3px double ink (the classifieds, the email box).
- `.cells`: a grid whose children are separated by 1px ink rules (`gap: 1px` over an ink background). Use it instead of borders on table-like groups.
- `.col-rules` on a grid container paints hairlines between its columns the full height of the section; set `--cols` to the column count (12 default). Hidden under 768px.
- `.row` with `data-sev`: the bottom rule is a data channel. Default 1px soft; `high` 2px ink; `critical` and `kev` 3px double stamp. Used on the wire, the archive, dossier mentions.
- `.stamp`: the flat KEV stamp (condensed, stamp red, 1.5px box). Never rotated or textured. `.stamp-ink` for the ink variant.
- `.tag`: a category code in its category's ink, 1px box. `GlyphChip` renders it.
- `.ruled-input`: form inputs have only a 2px ink bottom rule.
- `.ulink`: underlined text links (soft underline, ink on hover).

## Primitives (`components/site/`)

- `Masthead.tsx`: `FrontMasthead` (tape + nameplate + the sticky strip that arrives on scroll) for `/`; `SiteHeader({ section })` = the compact strip with a section line ("Section B · Adversaries") for every other page.
- `SiteFooter({ total })`: the colophon. Four cells, the printer's line, the edition number.
- `EditionNo`, `EditionToggle`, `TodayLine`, `StickyStrip`.
- `Kicker` (label, live dot only when live), `Button` (primary = ink block, ghost = ink box, pill = underlined), `Panel` (1px box, no radius; `limb` = 2px top rule; tone void = deeper stock), `PageHead` (secondary page head).

## The front page (`app/page.tsx`)

1. **Tape** (40px, black in both editions, a soft rule beneath): live dot, "The wire", the newest dispatch as one line (desktop), the UTC clock.
2. **Nameplate**: 2px rule · `No. {total}` + the LATE slot + the dateline | the logo | the 24h dial with its caption "Last 24 h · N dispatches · K KEV" (`components/home/Dial.tsx`, one tick per dispatch at its UTC hour, KEV ticks red and longer, a hand that turns once a day; caption only on phones) · 1px rule · sections / RSS JSON Telegram DAY–NIGHT · 2px rule. The sections are exactly five: Stack check, Adversaries, Claims, Azerbaijan, API (phones print Stack check and API). Archive, About and Census are in the colophon; Exploits returns to the nav when its board is populated.
2a. **Stack desk** (`StackDesk.tsx`, 2026-10-17, page one above the fold at 1280px): the positioning line as the page's h1 ("Paste what you run. See what is being exploited right now, by whom — with the report that proves it."), the paste box (`StackCheck compact`, runs in the browser against `/api/v1/stack`), and beside it a pre-run example that is one real row of the cited map: CVE, KEV stamp with CISA's date, FIRST EPSS, the actor and the verbatim quote with its source link (`lib/home-tool.ts` + `lib/stack/example.ts`, hourly, last-good snapshot, no NVD). Under it "No key. curl it." with a one-line curl that works as pasted, and one quiet pipeline line (sources that delivered items in 24 h, cited CVE–actor pairs). No email form anywhere on the site: the waitlist and every "alerts are next" promise were removed.
3. **Front page grid**: the lead (`Lead.tsx`) in columns 1–7, THE WIRE (`Wire.tsx`) in 9–12 behind a 1px rule; on phones the wire follows the lead and the index strip comes after. The lead is the newest actively-exploited story: one eyebrow line (filed UTC, relative time, CVE id, category, the stamp), a title-length-aware headline with unbreakable CVE ids, the full summary, a dateline with source, CVSS, EPSS, KEV added/due. The wire is ten rows `№ | HH:MM UTC | title | tag`, printed in full (no truncation anywhere on the front page), severity rules, a gap row ("14 more in the archive →") wherever the per-source cap skips ordinals, and the archive link. **The whole front page is set in UTC and says so once**; inner pages may print the reader's zone.
4. **Index strip** (`IndexStrip.tsx`): four seven-day figures in `.cells`, the 14-day bars, the source line.
4a. **Regional desk** (`RegionalDesk.tsx`): the Azerbaijan board's 7-day claim count and its newest claims (claimant, target, our check), from the same board `/az` prints, read on the front page's hourly clock.
5. **Standfirst**: H2 + three ruled columns (wire / archive / feed) each ending in a real artefact.
6. **Census** (`Census.tsx`): full-bleed deeper stock, a real `<table>` with a shared log10 ruler (1k·10k·100k·1M gridlines, ink bar to this sweep, hollow tick at the previous), deltas up = worse, the honest footnote. Under 768px the ruler column and its legend are not printed and the note sits under the product name, so the table never scrolls sideways.
7. **Roster** (`Roster.tsx`): the dossier totals as a ledger, the adversaries named on the wire in 90 days with pressed names.
8. **Earlier edition** (`Yesterday.tsx`): the previous day's dispatches in two columns with their ordinals.
9. **Classifieds** (`Classifieds.tsx`): "Grounded to source. Nothing invented." and the four ways to follow, in a double box.
10. **Colophon**.

Every module prints `as of HH:MM UTC` (`AsOf.tsx`) from its own blob's time, never the render time; a stamp from an earlier UTC day carries its date.

Data: one hourly blob (`lib/home-data.ts`: wire with ordinals, lead, week, daily, total, firstAt, last24h, yesterday) plus the census and actors blobs; each kept as a last-good snapshot (`lib/snapshot.ts`). `WireLive.tsx` polls the cached `/feed.json` every five minutes while visible and, on a new dispatch, rolls the edition number, prints LATE, unfolds the new row, swaps the tape and re-ignites the mark.

## Shared chrome on phones

The compact strip hides the clock, Telegram and the edition toggle under 768px by wrapping them in `hidden md:inline` spans: a component that sets its own display class (the toggle, the clock) would otherwise beat a `hidden` passed to it, and the strip was 45px wider than a phone. Nothing on any page may widen the document past the viewport; the Playwright pass reports `OVERFLOW` when it does.

## Secondary pages

Every inner page: `SiteHeader({ section })`, a `PageHead` or its own head in the headline face, the same rules and rows, `SiteFooter`. Wording on dossiers is fixed: **assessed origin**, **observed targets (as stated by the sources)**, **last observed on leak site**, **attribution confidence N/100 (source-stated)**; never "from", "targets", "inactive", "dead". A field the sources do not state prints nothing (or, where a slot must exist, a redaction bar captioned "not stated by sources"). Two inks on a dossier (ink + stamp) plus the one orange.

## Motion

Load: masthead rules draw from the centre, the mark ignites, the lead rises, wire rows fade in top to bottom (≈1.1s total, CSS only). Scroll: nothing fades in; `data-sc` only gates the authored draws (column rules draw downward, census and fourteen-day bars draw once) when a block enters view, with a fail-safe reveal after six seconds. Hover: underlines, row rules, pressed names. Live: the clocks, the live dot, the dial hand, WireLive. Everything respects `prefers-reduced-motion`; content is always visible without JS.

## Rules

- Real data or nothing: no placeholder logos, quotes, invented numbers, no "coming soon".
- Orange only in the logo, the live dot and focus; red only for KEV and "worse"; no colour as the only channel.
- No cards, shadows, gradients, glass, radius, grain, textures, marquees, count-ups, scanlines, rotated stamps.
- One kicker per section at most; the heading carries its own weight.
- Pages that read cookies or `searchParams` cannot be static: the front page is hourly ISR, the archive hourly per page, stories and dossiers daily. Keep it so.
