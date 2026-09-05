# skopnix.com

The web surface for skopnix — a cyber-threat-intelligence wire. Next.js 16 (App
Router) + React 19 + Tailwind v4, reading a MongoDB Atlas archive that
`ctiaze-engine` (a separate repo) fills 24/7. See `RUNBOOK.md` for the full
system map, env vars and incident playbook.

## The live surface

- **`/`** — the landing page: hero, latest-dispatches panel, pillars, stats,
  an early-access email form.
- **`/news`** — the paginated archive of every published dispatch.
- **`/news/[slug]`** — a single story.
- **`/about`** — the one-page "what this is" (no invented claims).
- **`/admin`** — signups + visits dashboard, gated by `ADMIN_TOKEN`
  (`lib/admin-auth.ts`; fails closed if the env var is unset).
- **Feeds** — `/feed.json` (JSON Feed 1.1), `/rss.xml` (filterable:
  `?kev=1`, `?region=1`, `?cat=`, `?q=`), `/news-sitemap.xml` (Google News,
  48h window), `/sitemap.xml`, `/robots.txt`, `/llms.txt` (an AI-answer-engine
  map of the above). All read `lib/stories.ts` and stay in sync with what the
  site actually serves — see the comments in each route.
- **`ctiaze.tech`** — a separate, retired placeholder domain served from this
  same project (`app/coming-soon`, host-rewritten in `next.config.ts`).

Design contract: **`DESIGN.md`**. Every page is built from the primitives in
`components/site/` and the tokens in `app/globals.css` — read that file
before touching any markup or color.

## Folder convention: `_disabled`

`app/_disabled/`, `components/_disabled/` and `lib/_disabled/` hold the fuller
product (threat-actor dossiers, a CVE registry, exposure lookups, scan tools,
…) that shipped once but is currently shelved to keep the live surface small
and honest. It is **shelved, not deleted** — `next.config.ts` 307-redirects
its old routes to the landing page (temporary on purpose, so search engines
don't cache the redirect past relaunch) and `app/sitemap.ts` / `app/robots.ts`
/ `app/llms.txt` deliberately don't advertise it. See `RUNBOOK.md` →
"Bringing a shelved section back" for the un-shelving steps.

## Scripts

```bash
npm run dev          # local dev server
npm run build         # production build
npm run typecheck     # tsc --noEmit
npm run lint           # eslint
npm test               # node --test over tests/**/*.test.ts — no network, no Mongo
npm run health         # scripts/health-check.mjs — live smoke test against a deployed URL
npm run db:backup      # scripts/db-backup.mjs — dumps the Mongo archive to Desktop
npm run db:verify      # verifies a backup against live collection counts
npm run db:restore     # restores a backup to a (usually new) cluster
```

`npm test` runs the Node built-in test runner directly against the TypeScript
sources (`--experimental-strip-types`, zero test dependencies). It never
imports `lib/db` or `lib/stories` — those need a live Mongo connection — so
the suite covers pure logic only: slug/permalink round-trips, the
proof-of-work gate, rate limiting, signup parsing, the `StoryDoc` → `Story`
mapping, SEO helpers.
