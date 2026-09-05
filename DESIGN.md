# skopnix — design system (v3, "orbital wire", 2026-09-05)

The live surface is three pages: the landing (`/`), the archive (`/news`) and the
story page (`/news/[slug]`). Everything is built from the primitives in
`components/site/` and the tokens in `app/globals.css`. This file is the contract
those pages follow; if a page needs something new, add it to the system first.

Reference: skopnix's own locked core (deep ink, aurora, night globe, centered
display type, one orange accent) mixed with xintra.org's *structure* — the
three-zone header, dot-kickers, the product panel that straddles the hero seam,
the rounded panel/black-card rhythm, generous spacing, mono chrome. Not copied:
xintra's purple, its light sections, its notched photo cards, its logo wall,
its testimonials. Every number shown is real feed data.

## Tokens (`app/globals.css`)

| token | value | role |
|---|---|---|
| `--void` | `#05060a` | landing ground (behind the globe) |
| `--surface` | `#0a0b0d` | page ground |
| `--surface-raised` | `#10131a` | panels |
| `--surface-hover` | `#171b24` | panel hover / active row |
| `--ink-primary` | `#eef3f8` | text (cool starlight) |
| `--ink-secondary` | `#a3adbb` | body copy |
| `--ink-muted` | `#7d8796` | meta, ≥4.5:1 on surface |
| `--hairline` | `#1f2430` | dividers |
| `--limb` | `#35c9d6` | cyan structure lines ONLY — never text |
| `--brand` | `#ff5a1f` | signal orange — interaction + live ONLY |
| `--accent-critical` | `#ff4d5e` | KEV / critical |
| `--accent-good` | `#6cc98a` | live / grounded |
| `--radius-chip` | `2px` | data chips |
| `--radius-btn` | `6px` | buttons |
| `--radius-panel` | `12px` | panels, cards, the CTA band |

Type: **Schibsted Grotesk** (`font-display`) for wordmark + headlines; body in
the same face; **JetBrains Mono** for every piece of chrome and data — kickers,
nav, buttons, timestamps, counts, CVE ids — uppercase + tracked when it is a label.

## Primitives (`components/site/`)

- `SiteHeader` — three zones: mono links left, triad mark + wordmark centered,
  `TELEGRAM ↗` ghost + `EARLY ACCESS` orange right. Sticky, hairline bottom.
- `SiteFooter` — mark + tagline, dot-list mono links, outbound pill links, ©.
- `Kicker` — `● LABEL`, mono 11px, tracked. Orange dot when `live`. **One per section.**
- `Button` — `primary` (orange, ink text, mono uppercase, trailing `↗`/`→`),
  `ghost` (hairline), `pill` (rounded-full hairline, for outbound links).
- `Panel` — raised surface, hairline border, `--radius-panel`; optional cyan
  `limb` top line. Hairlines, never shadows.
- `AuroraField` — the streaks (+ optional globe + scrim). Shared by the landing
  and the ctiaze.tech placeholder so the hero recipe exists once.
- `PageHead` — secondary pages: left-aligned kicker + large display H1 + mono meta.

## Landing composition (`app/page.tsx`)

1. `SiteHeader`
2. Hero: `AuroraField` (globe deep in the background, ~70% opacity), centered
   kicker (real weekly count), "See it. Nix it.", one line of copy, the email
   form **in the hero**, honest mono status line ("as of hh:mm UTC").
3. `WirePanel` — a real product panel (latest dispatches, live dot, UTC clock)
   straddling the seam between the hero and the first section. The signature move.
4. Three numbered pillars (01 the wire · 02 the archive · 03 the API + MCP) —
   number in mono, display title, one line, one real artefact each (a 14-day
   dispatch sparkline, the archive total, a working `curl` against `/feed.json`).
5. Crosshair stat grid — `+` at the intersections, four real 7-day counts.
6. `CtaBand` — black rounded card over an orbital wireframe, second email form.
7. `SiteFooter`

## Rules

- Real data or nothing: no placeholder logos, quotes, or invented numbers.
- One orange element per view; cyan is a line, never a word.
- Motion is instrument, not screensaver: reveal on scroll, one live pulse, the
  clock ticks. Everything respects `prefers-reduced-motion`.
- Pages that read cookies or `searchParams` cannot be static — the landing is
  hourly ISR, the archive hourly ISR per page, stories daily ISR. Keep it so.
