# Product

<!-- impeccable:product-schema 1 -->

<!-- Written 2026-10-16 from docs/SKOPNIX-PLAN-2026-09-16.md, lib/site.ts and the
     live site. Facts marked (inferred) were not confirmed by Farid in person
     for this file; everything else is stated in the plan or the code. -->

## Platform

web

## Users

Primary: security engineers, SOC analysts and small-team CISOs anywhere in the
world who decide each week what to patch or watch first, usually without a paid
CTI contract. They arrive from LinkedIn, Telegram, a search for a CVE or an
actor name, or an RSS reader, on a phone as often as a desk.

Secondary: MSSP analysts, researchers and journalists who look up an adversary
dossier or a CVE page and leave; and machines, since the JSON feed, the API and
per-actor STIX are read by scripts, SIEMs and AI agents.

## Product Purpose

skopnix reads ~89 international security sources around the clock, verifies
every item against its original report and publishes it as a free global
threat wire: exploited CVEs with KEV flags, the adversaries behind them, ~1,400
adversary dossiers (aliases, assessed origin, ATT&CK kill chain, targeting
map, leak-site victims), a weekly worldwide internet-exposure census, an
archive of every dispatch, and keyless machine feeds (JSON Feed, RSS, API,
STIX, llms.txt). Success on the public site is a reader who follows the wire
(Telegram, RSS, API) and comes back; the paid product (stack exploitability
check, per the plan) is not built yet and nothing on the site may claim it.

## Positioning

Everything shown is grounded to a cited source and nothing is invented. No
other free wire ties each exploited CVE to the adversaries that use it with
the report that proves it, and does it from a one-person pipeline in Baku
that reads regional-language sources the big vendors skip (inferred wording;
the plan states the moat as "cited attribution + regional-language sources").

## Capabilities

- Live wire of dispatches (title, category, severity, KEV flag, UTC time, source).
- Archive, paginated, newest first, by day.
- Adversary roster with client-side search, "on the wire" (named in our last
  90 days), by-origin strip, A-Z; dossiers with attack rose, targeting dot-map,
  kill chain, arsenal, victims, wire mentions, reports, similar actors, STIX export.
- Per-CVE page (NVD, KEV, EPSS, stories).
- Weekly exposure census (Shodan-measured counts per product, week-on-week delta).
- Machine feeds: /feed.json, /rss.xml (?kev=1), /api/v1, /actors/[slug]/stix.json, /llms.txt.
- Email capture for future alerts (bot-protected), no account system.

## Constraints

- Real data or nothing: no placeholder logos, testimonials, invented numbers,
  no "coming soon" claims for things that do not exist.
- Fixed wording on dossiers: "assessed origin", "observed targets (as stated by
  the sources)", "last observed on leak site", "attribution confidence N/100
  (source-stated)"; never "from", "targets", "inactive", "dead".
- English only on product pages.
- No employer code, data or names. No Shodan resale. No sensor grid claims.
- Self-hosted Next.js 16 standalone on a 1 GB t3.micro behind Caddy; hourly
  ISR landing, hourly archive, daily stories and dossiers; no per-request
  database reads on the landing path. No new paid services.
- Fonts via next/font (self-hosted), CSP is 'self' only (no third-party scripts
  or CDNs at runtime).
- Must work on phones and under prefers-reduced-motion.

## Brand commitments

- The logo stays exactly as it is: the "triad" mark (components/CtiazeMark.tsx,
  hub plus three fused nodes, the top node signal-orange #ff5a1f) and the
  wordmark "skop" + "nix" with "nix" in orange. Everything else is open.
- Tagline in code: "The world's cyber threats, read straight off the wire."
- Public channel: https://t.me/skopnix. No published email (no MX record).

## Evidence

- All counts on the site come from the feed data (weekly dispatches, KEV
  count, CVE ids, sources reporting, archive total, census rows, roster sizes).
- Source grounding: every dispatch links the outlet that broke it.

## Terminology

dispatch (one wire item) · the wire · the archive · adversary / dossier ·
KEV (CISA Known Exploited Vulnerabilities) · the census · grounded to source.

## Accessibility

AA contrast, visible keyboard focus, skip link, reduced-motion respected,
no information carried by colour alone (KEV is a text chip, not only a dot).
