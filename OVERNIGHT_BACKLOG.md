# Overnight backlog — ctiaze-web

Checked/worked each night by the scheduled Claude Code session. Edit this file
any time to steer what gets attention — add, remove, or reprioritize items.

## Always check first (health, ~5 min)
- [ ] Run the automated smoke test (rewritten 2026-09-03 for the current
      two-landing-page surface: skopnix.com landing + /news + story pages +
      feeds + 404 lead recovery + security canaries, and ctiaze.tech's
      placeholder + story-rescue redirect). From `ctiaze-web/`:
        `node scripts/health-check.mjs https://ctiaze-web.vercel.app`
      (pass the Vercel alias — the scheduled sandbox's network filter blocks the
      bare domains; the two ctiaze.tech checks self-SKIP when unreachable, the
      funnel monitor Actions workflow covers them externally twice daily).
      Exit 0 = healthy; any `FAIL` line names what broke.
      WHY the two-story title check exists: on 2026-08-01 the homepage was
      fully green while every CVE article page silently served the wrong
      (latest CVE) story — a green homepage does NOT mean article pages are OK.
- [ ] Latest Vercel deployment status — Ready, no build errors.
- [ ] Any new console/runtime errors surfaced since the last check.

## Investigate / improve (pick 1-2 per night, don't boil the ocean)
- [ ] Vercel Analytics — any real traffic yet? Which posts are getting
      clicks/views (once there's enough data to be meaningful)?
- [ ] Visual/UX polish opportunities — but don't redesign unprompted; note
      ideas rather than executing anything big without approval.
- [ ] Any TypeScript/lint warnings introduced since the last check.
- [ ] Mobile responsiveness spot-check after any layout change.

## Shipped (Farid gave explicit go-ahead 2026-07-28)
- [x] IOC/CVE lookup tool — DONE 2026-07-30 (Farid: "fix everything that doesn't
      need my actions, I give permissions"). Built on the MAIN site at `/ioc`
      (not ctiaze.dev): paste any IP/domain/URL/hash → abuse.ch ThreatFox
      reputation + geo; paste a CVE → CISA KEV + FIRST EPSS + NVD. Deliberately
      KEYLESS (ThreatFox recent-export, not the Auth-Key API) so it can't go dark
      if a key rotates — the local abuse.ch key currently 401s. Also renders a
      live malicious-infra board. `lib/threatfox.ts`, `lib/cveintel.ts`,
      `app/api/threat/route.ts`, `components/ThreatLookup.tsx`, `app/ioc/page.tsx`.
      Verified live on the vercel alias. (Shodan is NOT used here — kept on
      `/exposure` only, still daily-capped on the academic acct.)
- [x] Public JSON/RSS feed export — DONE. `feed.json`, `rss.xml`, `llms.txt`
      routes (reuse `getStories()`, snake_case `FeedItem` contract, CDN-cached).
      Verified live. This was the roadmap's "structured substrate" wedge.
- [x] ctiaze.dev developer portal (separate repo `ctiaze-dev`) — DONE. Read-only
      MCP server at /api/mcp (4 tools over the same Mongo archive) + landing
      page. NOTE: needs `MONGO_URI_READONLY` added to the ctiaze-dev Vercel
      project before the MCP tool calls return data (handshake already works).

## Pending Farid's go-ahead (researched, DO NOT build unattended — see
## memory: ctiaze-platform-roadmap.md for the full research + reasoning)
- (IOC/CVE lookup tool shipped 2026-07-30 — see Shipped above. If Farid still
  wants a ctiaze.dev-side version with AbuseIPDB/GreyNoise/Shodan enrichment,
  that's a separate, still-pending build needing his nod + those API keys.)

## Guardrails (see CLAUDE.md for the full autonomous-work policy)
- Safe to fix directly: genuine bugs with verification, dependency patch
  bumps, dead code cleanup, small copy fixes.
- Flag, don't touch without morning approval: design/layout changes beyond a
  trivial fix, new paid services/integrations, anything touching the
  read-only Mongo credential or env vars, AND the pending roadmap items above
  even though they're zero-cost — new product surfaces need Farid's nod.
