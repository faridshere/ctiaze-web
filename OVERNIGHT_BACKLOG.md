# Overnight backlog — ctiaze-web

Checked/worked each night by the scheduled Claude Code session. Edit this file
any time to steer what gets attention — add, remove, or reprioritize items.

## Always check first (health, ~5 min)
- [ ] Live site responds (via the ctiaze-web.vercel.app alias, since this
      sandbox's network filter blocks the bare ctiaze.tech domain directly).
- [ ] Latest Vercel deployment status — Ready, no build errors.
- [ ] `/api/latest` returns a sane count; story count roughly matches the
      engine's published total.
- [ ] Any new console/runtime errors surfaced since the last check.

## Investigate / improve (pick 1-2 per night, don't boil the ocean)
- [ ] Vercel Analytics — any real traffic yet? Which posts are getting
      clicks/views (once there's enough data to be meaningful)?
- [ ] Visual/UX polish opportunities — but don't redesign unprompted; note
      ideas rather than executing anything big without approval.
- [ ] Any TypeScript/lint warnings introduced since the last check.
- [ ] Mobile responsiveness spot-check after any layout change.

## Guardrails (see CLAUDE.md for the full autonomous-work policy)
- Safe to fix directly: genuine bugs with verification, dependency patch
  bumps, dead code cleanup, small copy fixes.
- Flag, don't touch without morning approval: design/layout changes beyond a
  trivial fix, new paid services/integrations, anything touching the
  read-only Mongo credential or env vars.
