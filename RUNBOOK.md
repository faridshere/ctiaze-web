# skopnix.com — operations runbook

One founder, zero budget, everything automated. This file is what you read when
something breaks (or when future-Claude needs the map). Kept honest as of
2026-09-03.

## The system in 30 seconds

```
66 sources ──▶ ctiaze-engine (GitHub Actions, ~5 runs/day effective)
                 │  AI relevance/grounding/translation rides the CLAUDE
                 │  SUBSCRIPTION (CLI transport) — shared with your own usage
                 ├──▶ MongoDB Atlas M0 "Cluster1" (db: ctiaze) — the ONLY database
                 └──▶ Telegram @skopnix — every post links skopnix.com/news/<slug>?s=tg

ctiaze-web (Vercel, repo public) serves BOTH domains from one project:
  skopnix.com   = landing (globe + email + "on the wire" strip) + /news/* stories
                  + /actors (adversaries: index + ~1,300 dossiers — released 2026-09-05)
  ctiaze.tech   = "Something is coming" placeholder + email (host rewrite)
  full product (actors/cve/scan-me/…) = SHELVED in app/_disabled — not deleted
```

The whole business right now: **turn Telegram readers and old links into emails.**

## Env vars (the usual suspect when something "stores nothing")

| var | where | breaks without it |
|---|---|---|
| `MONGO_URI_READONLY` | Vercel | stories, wire strip, sitemaps go empty | (and the adversaries section: roster, actor_pack, graph, ttp_profiles, mitre_techniques)
| `MONGO_URI_WRITE` | Vercel | **emails + visits silently not stored** (form says "not open yet") |
| `ADMIN_TOKEN` | Vercel | /admin locked for everyone (fails closed — by design) |
| `MONGO_URI` | GitHub secret, ctiaze-engine | pipeline can't store/publish |
| `TELEGRAM_*` | GitHub secrets, ctiaze-engine | posts don't go out (chat id is numeric — survives renames) |

After changing any Vercel var: **redeploy** (vars apply at deploy, not live).

## Incident playbook

**Telegram channel silent**
→ github.com/faridshere/ctiaze-engine → Actions. Runs red with
"transport/token is down" = the Claude subscription's limits are exhausted
(this exactly caused the Aug 31–Sep 1 outage wall). It self-heals when limits
reset; skipped items are retried next run. Don't burn Claude sessions to 100%.
Note: cron says every 2h but GitHub throttles free scheduled runs to ~5/day —
that's normal, not an incident.

**Funnel monitor red (email from GitHub)**
`.github/workflows/funnel-monitor.yml` probes twice daily. Map:
- "landing renders" → Vercel outage or bad deploy → check vercel.com deployments
- "wire strip has data" → Mongo read path broken → check MONGO_URI_READONLY / Atlas
- "placeholder renders" → ctiaze.tech domain/rewrite issue (next.config.ts rewrites())
- "xeber → news rescue" → redirects() in next.config.ts regressed
- "admin leaks nothing" → **drop everything, that's a data leak**
- "waitlist rejects tokenless" → PoW gate broken → check /api/challenge

**Off-site backup red (email from GitHub)**
`ctiaze-engine/.github/workflows/db-backup.yml` runs weekly (Sundays) and uploads
a full DB dump as an artifact (14-day retention, private repo). If it fails, the
MONGO_URI secret or Atlas is the usual cause. Trigger a manual run from the
engine repo's Actions tab. This is the copy that survives losing the laptop; the
local `npm run db:backup` is the other.

**Vercel "exceeded free resources"**
Usage is shared across ALL projects on the account. First move: check for
stray projects burning quota (ctiaze-dev and irai were candidates). Hobby has
no overage billing — resources pause until the 30-day window rolls. Static
pages keep serving; functions (waitlist, scan, admin) stop.

**MongoDB bill / suspension**
History: the Aug 2026 $30.81 was 100% "Cluster0", an empty M10 nobody used
(deleted). Cluster1 (all data) is free M0 forever. If the org gets suspended
over the old invoice, Cluster1 goes down WITH it — that's why backups exist.
Always read the invoice per-cluster before believing a migration is needed.

**Restore to a fresh cluster** (new Atlas account plan)
```
npm run db:backup                        # fresh dump first (~1 min, 17MB)
RESTORE_URI='mongodb+srv://…' node scripts/db-backup.mjs restore ~/Desktop/skopnix-db-backup/<date>
node scripts/db-backup.mjs verify …      # against the NEW cluster
```
Then repoint THREE places: Vercel MONGO_URI_READONLY + MONGO_URI_WRITE,
and the ctiaze-engine MONGO_URI secret. Redeploy + one green pipeline run
before decommissioning the old cluster.

## Weekly habit (2 minutes)

```
cd ~/Desktop/carbanak/claude-test/ctiaze-web && npm run db:backup
```
M0 has **no automated backups**. The dump is canonical EJSON (types survive),
verified against live counts, ~17MB on Desktop.

Security hygiene (occasionally): `npm audit --omit=dev` in ctiaze-web should read
0 vulnerabilities — Next is pinned to a patched minor and `overrides.nanoid`
keeps the transitive fix. A Next bump can shift behaviour, so always rebuild +
run the funnel checks before trusting one.

## Attribution legend (reading /admin)

- visits `from: tg` → came through a Telegram post link (`?s=tg`)
- signup `source: skopnix-landing` → skopnix.com homepage form
- signup `source: ctiaze-landing` → ctiaze.tech placeholder form
- signup `source: story:inline` → the form under a story
Visits expire after 30 days (TTL); emails keep forever.

## Bringing a shelved section back

`components/site/` is the design system (see `DESIGN.md`) — a section coming
back should be rebuilt on its primitives (`SiteHeader`/`SiteFooter`/`PageHead`/
`Kicker`/`Button`/`Panel`), not on whatever markup it shipped with pre-shelving.

1. `git mv app/_disabled/<section> app/<section>` (its API: `app/_disabled/api-<x>` → `app/api/<x>`)
   and, if it has its own components/lib, `git mv components/_disabled/<X>.tsx components/<X>.tsx`
   and `git mv lib/_disabled/<x>.ts lib/<x>.ts` — then rewrite every
   `@/components/_disabled/…` / `@/lib/_disabled/…` import the moved files (and
   anything that imports them) still have, back to the un-shelved path.
2. Remove its line from the `shelved` list in `next.config.ts` redirects()
3. Add it back to NAV in `components/Header.tsx` and to `app/sitemap.ts`
4. Restore any pointers that were neutralized (grep `_disabled` in comments —
   e.g. IocPanel's /ioc link), and re-add the section's line in
   `app/llms.txt/route.ts` (it must only advertise pages that actually resolve)
5. Build locally; watch the page count and revalidate column in the route table
   — that's what protects the ISR budget

## Hard-won rules (each cost real money or a real outage)

- Measure before migrating: the Mongo bill was an unused cluster, not "Mongo
  is expensive"; the Actions "risk" was 394 min/mo against a 2,000 cap.
- Revalidate windows must be ≥ how often content actually changes, or ISR
  writes explode (the 182k/200k scare).
- ctiaze.tech redirects must be HOST-scoped and absolute, or they land on the
  placeholder (relative redirects stay on the requesting domain).
- Nothing user-visible ships on "should work" — build it, run it, screenshot
  it, hit it with curl, then push.
