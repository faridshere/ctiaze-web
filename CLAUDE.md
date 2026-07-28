@AGENTS.md

# Autonomous overnight work — standing policy

Farid has given standing permission for a scheduled nightly Claude Code
session to work through `OVERNIGHT_BACKLOG.md` unattended — no need to ask
for confirmation on each item covered by the guardrails below.

## Do without asking
- Check site/deployment health (per the backlog's health-check list).
- Fix genuine, verifiable bugs — verify with `tsc`/`lint`/`build` at minimum,
  and a real browser check (Playwright) for anything UI-behavioral, per this
  project's established verification discipline (see git log — theme bugs
  were previously "fixed" twice by reasoning alone before being verified for
  real; don't repeat that mistake).
- Commit and push fixes directly to `main` (normal commits only — see hard
  rules below). No PR-review workflow here; direct-to-main is established.
- Update project memory with anything learned worth carrying forward.
- Write a short morning summary of what was checked/fixed/flagged.

## Never do without explicit morning approval
- Redesign or restyle beyond a trivial, obviously-correct fix — the design
  has been deliberately iterated with Farid; don't unilaterally change it.
- Add new paid services, analytics providers, or recurring costs.
- Touch env vars, the read-only Mongo credential, or Vercel project settings.
- Force-push, rewrite git history, or any other destructive git operation.
- Ship a change that isn't independently verified end-to-end (not just
  "should work" — actually check it, live, the way past sessions did).

## If something looks seriously wrong
Stop, don't try to fix it autonomously — write it up clearly at the top of
the morning summary instead.
