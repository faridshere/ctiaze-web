# Working on skopnix, with two people

Written 19 September 2026, the week a second engineer joins. It is the one
document to read first. It says what the system is, how to get it running, how
the two of you divide and merge work, and the order of the three moves planned
next. Where it disagrees with an older document, this one is newer.

`docs/SKOPNIX-PLAN-2026-09-16.md` still owns product scope and guardrails.
This file owns how the two of you work.

---

## 1. What exists

Three repositories under `~/Desktop/carbanak/claude-test/`. They share one
MongoDB Atlas database called `ctiaze` — the name predates the rebrand and
stays.

| Repo | What it is | Who deploys it | Public? |
|---|---|---|---|
| `ctiaze-engine` | The pipeline. Every 2h a GitHub Actions cron fetches ~89 sources, judges and grounds them with Claude, writes an Azerbaijani rewrite, links stories to threat actors, publishes to Telegram and to the database. **Only this repo writes.** | GitHub Actions | private |
| `ctiaze-web` | skopnix.com. Next.js 16 on Vercel. Reads the same database, never writes except signups and the visit beacon. | Vercel, on push to `main` | **public** |
| `ctiaze-dev` | ctiaze.dev. A read-only MCP server, last touched in July, currently returning errors because its Vercel project has no database URI. | Vercel | **public** |

Two of the three are public. Nothing secret may enter them, and that includes
prose: a document describing which database user holds which role is a target
list, not documentation. (One such document was removed on 19 Sep.)

The data flows one way: **engine writes → website and MCP read.** If a field
appears on the site, the engine put it there. That is the contract, and most
of the bugs found in the audit were two sides of it drifting apart.

---

## 2. Day one, for the new engineer

Takes about twenty minutes. Nothing here needs a production credential except
the last step.

```bash
git clone https://github.com/<org>/ctiaze-web.git
cd ctiaze-web
nvm use                 # Node 22, from .nvmrc
npm ci
npm run typecheck && npm run lint && npm test     # 92 tests, offline
cp .env.example .env.local                        # then fill in, see §3
npm run dev
```

```bash
git clone https://github.com/<org>/ctiaze-engine.git
cd ctiaze-engine
uv venv --python 3.11 .venv && source .venv/bin/activate
uv pip install -r requirements.txt                # or python3.11 -m venv
python -m pytest -q                               # ~386 tests, offline, no keys
python -m cti.run 25                              # a real fetch, stateless, harmless
```

Read, in this order: this file, `ctiaze-web/RUNBOOK.md` (what to do when
something looks wrong), `ctiaze-engine/RUNBOOK.md`, `ctiaze-web/DESIGN.md` if
you touch the UI, `ctiaze-engine/SECURITY-REVIEW.md` if you touch the pipeline.

Two rules that are not obvious and have each cost a day:

- **Never run `python -m cti.run --auto` with the production `.env`.** That is
  a live publish to the Telegram channel, not a test. Without secrets every
  stage degrades to a labelled stub and nothing is posted.
- **A Vercel environment variable binds at build time.** Changing one does
  nothing until you redeploy.

---

## 3. Credentials: one per person, never one shared

Today every credential is a single shared value: one `/admin` token, one
database user per role, one Telegram bot, one GitHub push token. Two people
sharing those means no attribution, and revoking a leaked one locks out both.
Before the friend gets access, split what can be split:

| Thing | Today | Do this |
|---|---|---|
| GitHub | personal repos, one PAT | transfer to an **organisation**; each person their own account and 2FA; no shared PAT |
| MongoDB Atlas | one project, shared users | invite him as an Atlas **user** on the org; each person their own login. Application users stay per-role, not per-person |
| Vercel | one personal account | a Vercel **team**; invite him |
| `/admin` on skopnix.com | one shared token | fine for now, but treat it as a shared password: rotate when either of you leaves a machine behind |
| Telegram bot | one token | one token, kept in the engine's GitHub secrets only |
| The database URIs | in `.env.local` / `.env` on each laptop | each person gets their own copy from the console. **Never paste a URI into chat, a commit, or a document.** |

A developer needs exactly two secrets to be useful: `MONGO_URI_READONLY` for
the website and `MONGO_URI` for the engine. Everything else is optional and
documented in each repo's `.env.example`.

---

## 4. How the two of you work

The repos were built by one person pushing straight to `main`. That was the
right call alone and is the wrong call with two people: you will overwrite each
other, and there is no second pair of eyes on a pipeline that publishes
automatically.

**Adopt this, it costs about five minutes a day:**

1. **Branch per change.** `git checkout -b fix/backlog-drain`. Short-lived;
   merge within a day or two.
2. **Pull request into `main`.** CI runs typecheck, lint and the tests on both
   repos. Require it to pass; on GitHub, Settings → Branches → protect `main`.
3. **The other person reviews.** Not a ceremony — one read of the diff. The
   question is "would I have known this was wrong in six months", which is why
   the commits and comments in these repos say *why*, with dates and measured
   numbers. Keep that habit; it is the single most valuable thing in the code.
4. **Merge, then watch.** A web merge deploys to Vercel in about two minutes.
   An engine merge affects the next cron run within two hours.

**Divide by system, not by ticket.** The two repos need different heads:

- One of you owns the **engine and the data**: sources, the AI passes, actor
  linking, correctness of what gets published. Python, Mongo, no UI.
- The other owns the **website and the product surface**: Next.js, the design
  system in `DESIGN.md`, the API, performance, the free stack check when it
  ships.
- The **contract between them** — a field the site reads that the engine
  writes — is where things break silently, so any change to it is reviewed by
  both. Six of the confirmed audit findings were exactly this.

**Say what you are doing before you do it.** With two people and one database,
the expensive mistakes are simultaneous ones: both editing the actor matcher,
or one running a backfill while the other restores a cluster. A one-line
message beforehand is enough.

**Definition of done**, same as the repos already state: typecheck, lint and
tests green, and *verified for real* — a browser check for UI, a hermetic run
for the pipeline. "Should work" is how two theme bugs shipped twice.

---

## 5. What CI enforces now

| Repo | Workflow | Runs | Gate |
|---|---|---|---|
| `ctiaze-web` | `ci.yml` | push to `main`, every PR | `tsc --noEmit`, `eslint`, **`npm test` (92)** |
| `ctiaze-web` | `funnel-monitor.yml` | twice daily | landing renders, wire has real rows, redirects, admin leaks nothing, waitlist rejects tokenless posts |
| `ctiaze-engine` | `tests.yml` | push to `main`, every PR | `pytest` (~386) |
| `ctiaze-engine` | `pipeline.yml` | every 2h | the product itself. A red run means something is structurally broken and GitHub emails you |

`npm test` was added on 19 Sep — until then the web suite ran nowhere.

Run `node scripts/health-check.mjs https://skopnix.com` any time you want a
15-point answer about the live site. It is honest now: the "Mongo read works"
check used to match static page copy and could not fail.

---

## 6. The three moves, in order

Do them one at a time, and leave a working system between each.

### 6.1 Atlas account move — first, because billing forces it

The organisation is scheduled for suspension on **1 October 2026**, and that
takes the site and the pipeline down together.

1. **Fix the credential first, before anything is copied.** The public
   website currently authenticates with the pipeline's project-superuser. In
   the new project create two application users: one with `read` on `ctiaze`
   only, one with `readWrite` on `ctiaze` only. Verify with
   `node --env-file=.env.local scripts/check-db-privileges.mjs` — it exits 0
   only when the website's credential can do nothing but read.
2. **Set the network access list** on the new project before pointing anything
   at it, or the first deploy and the first cron both fail at connect.
3. **Back up from a laptop, not from the GitHub artifact.**
   `npm run db:backup` — it writes ~16 MB to `~/Desktop/skopnix-db-backup/`
   and verifies every collection count against the live cluster.
4. **Restore, then verify against the NEW cluster.**
   `RESTORE_URI='mongodb+srv://…' node scripts/db-backup.mjs restore <dir>`
   then, with `RESTORE_URI` still set, `node scripts/db-backup.mjs verify <dir>`.
   It now follows `RESTORE_URI` and prints the host it checked — it used to
   always read the old cluster and print success regardless.
5. **Keep the database named `ctiaze`.** Three repos and ~35 batch scripts
   hardcode it. `MONGO_DB` exists as an escape hatch but has to be set in every
   one of them at once, so the sane choice is not to need it.
6. **Repoint four places, not three:** `MONGO_URI_READONLY` and
   `MONGO_URI_WRITE` in the ctiaze-web Vercel project, `MONGO_URI` in the
   ctiaze-engine GitHub secrets, and `MONGO_URI_READONLY` in the ctiaze-dev
   Vercel project if that site is kept. Redeploy both Vercel projects.
7. **Confirm:** `npm run health` against skopnix.com is 15/15, one engine cron
   run is green, and a new dispatch appears on the wire within about two hours.
8. Only then decommission the old cluster.

Create `signups.email` as a unique index on the new cluster while you are
there — the waitlist upserts on that field and nothing enforces it today.

### 6.2 GitHub organisation

- Create the org, transfer all three repos. GitHub redirects the old URLs, but
  the redirect dies if anyone ever recreates a repo at the old path, so update
  the URLs in `RUNBOOK.md` and in the Vercel git integration.
- **Recreate the Actions secrets by hand.** Only `ctiaze-engine` has any, and
  it has thirteen: `MONGO_URI`, `CLAUDE_CODE_OAUTH_TOKEN`, `LLM_API_KEY`,
  `CTIAZE_LLM_MODEL`, `CTIAZE_REWRITE_MODEL`, `TELEGRAM_TOKEN`,
  `TELEGRAM_CHANNEL`, `TELEGRAM_PUBLIC_CHANNEL`, `SENTRY_DSN`,
  `CTIAZE_FETCH_PROXY`, `SHODAN_API_KEY`, `BACKUP_PASSPHRASE`,
  `DO_INFERENCE_KEY`. Missing ones fail quietly: without `SHODAN_API_KEY` the
  weekly exposure sweep dies, without `CTIAZE_FETCH_PROXY` nine sources vanish
  from the wire with only a per-source error line.
- **Transferring a repo carries its full history.** The credential map was
  redacted at HEAD on 19 Sep but is still in earlier commits of a public repo.
  Decide before the transfer whether to scrub it with `git-filter-repo` (a
  force push that rewrites every hash) or to accept it and rely on the
  credential being rotated. Rotating is the better answer either way.
- Turn on branch protection on `main` while you are in the settings.

### 6.3 AWS or Azure — not yet

The audit looked at this specifically. **Do not move hosting now.** The site
costs about nothing on Vercel, the pipeline runs on free Actions minutes, and
leaving Vercel breaks four things at once:

- `lib/ratelimit.ts` `clientIp()` trusts the `x-real-ip` header. Vercel's edge
  overwrites it on every request, so it is trustworthy there and nowhere else.
  Every rate limit, the proof-of-work caller binding and the visitor IPs stored
  for `/admin` key on that value; on a stock ALB, CloudFront or Front Door
  setup a caller picks their own, and the five-attempt admin-login cap becomes
  unlimited. This has to be rewritten *before* any move, not after.
- Every `unstable_cache` blob and ISR window assumes Vercel's shared,
  deployment-surviving data cache. On two containers you get two different
  front pages and a ~30 s cold roster recompute per instance per hour. It needs
  a Redis cache handler first.
- `@vercel/analytics` and the `x-vercel-ip-*` geo headers become silent no-ops:
  every page requests a script that 404s, and `/admin` shows no countries.
- `maxDuration = 60` is a Vercel-only setting over renders already measured at
  ~30 s. Elsewhere the default timeout is lower and those pages 504.

Revisit when there is a concrete reason — a commercial-use requirement, a
compliance ask, or credits that actually change the cost. Vercel Pro at $20/mo
answers the commercial-use question far more cheaply than a migration does.

---

## 7. Where the sharp edges are

Things that will bite someone new, all of them load-bearing:

- **The database is the interface.** `items` is one document per story; the
  site sorts on `effective_at` (when the news happened), not `published_at`
  (when the bot posted). The rule that computes it is heavily commented in
  `cti/store.py` and each threshold was measured against the live archive.
- **Nothing is attributed without a citation.** No actor↔CVE row ships without
  a source URL, and the alias-precision rules that keep "CHROMIUM" from meaning
  Earth Lusca live in `cti/actors.py`. The website has a copy of the stoplist;
  keep them in sync or the website starts making claims the engine refuses to.
- **Shelved code is not dead code.** `app/_disabled/` and `lib/_disabled/` hold
  the stack-check product that the plan brings back in week 1. Do not delete
  it, and do not let it rot.
- **Run a new matcher over the real archive and read the output** before
  trusting it. Every false-positive class in this codebase was found that way
  and none by a unit test.
