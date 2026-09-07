# Working in ctiaze-web (skopnix.com)

Read this before proposing a change. Most of it exists because something here
was already broken once in a way that looked fine in review.

## What this project actually claims

skopnix publishes automated threat intelligence and its entire promise is
"grounded to source, nothing invented". That is not marketing copy, it is a
constraint on the code. A change that makes the site state something it cannot
support is a worse defect than a crash, because a crash is visible.

Concretely:
- **`null` means unknown. It never means zero, and it never means low.** A
  missing CVSS, EPSS or severity is a gap in the public record. Do not default
  it, infer it, or hide it behind a friendlier value.
- **KEV outranks EPSS whenever they disagree.** EPSS *predicts* exploitation in
  the next 30 days; KEV *records* exploitation already observed. Showing "EPSS
  2%" beside a KEV badge reads to a non-specialist as "2% risk" on something
  being actively exploited, which is the opposite of the truth. See
  `lib/storysignal.ts`.
- **Exposure counts are dated scan totals, not inventories.** Never describe an
  exposure number as "vulnerable hosts", and never present a count measured on
  one date with a different date's stamp.
- If a feed or API field is documented anywhere (`/llms.txt`, `/api-docs`), the
  code must actually emit it. Documenting a field you do not serve is the most
  damaging bug class in this repo — it silently teaches every crawler and agent
  the wrong schema.

## Contracts that are easy to break

- **`slugify()` and `storyIdKey()` in `lib/slug.ts` are two halves of one
  contract.** Only the first 12 characters of a slug address a story. That key
  is a PREFIX, not an identity: CVE ids are 14+ characters, so `CVE-2026-202`
  matches both `CVE-2026-20200` and `CVE-2026-20212`. `getStoryBySlug` must
  therefore collect every candidate and disambiguate on the full regenerated
  slug. Do not "simplify" it back to `findOne`.
- **`unstable_cache` survives deployments.** It stores the *computed* value, so
  changing how a derived field (a slug, a title, a row shape) is produced will
  keep serving the old one until the version string in the cache key changes.
  If you change a derivation, bump the key in the same commit.
- **Anything under `lib/_disabled/` or `components/_disabled/` is shelved on
  purpose.** Do not import from it, revive it, or "fix" it.
- Email validation in `lib/signup.ts` deliberately rejects a leading `=`, `+`,
  `-` or `@`, and the admin CSV export quotes every field. That is a spreadsheet
  formula-injection guard, not over-caution. Both layers stay.

## Verification

`npx tsc --noEmit`, `npx eslint`, `npm test` and `npm run build` must all pass.
That is the floor, not the bar.

For anything that changes what a user sees, check it in a real browser against a
production build before claiming it works. This repo has a history of changes
being "fixed" by reasoning alone and shipping broken. Two traps:
- `pkill -f "next start"` does **not** kill the dev server; the process is
  `next-server`. Use `kill -9 $(lsof -ti:PORT)` or you will test a stale build
  and reach a confident wrong conclusion.
- A page can render correctly and still be served stale from the data cache.

## Secrets and infrastructure

Never commit a credential, and never read one into a diff. `MONGO_URI_WRITE` and
`ADMIN_TOKEN` live in Vercel and the macOS keychain. Do not add analytics, paid
services or recurring costs. Do not change Vercel project settings.

`lib/admin-auth.ts` fails closed by design: with no `ADMIN_TOKEN` set, nobody
gets in. Keep it that way — a missing env var must never mean "open".

## Style

Match the file you are editing. Comments explain *why*, especially where the
obvious approach is wrong; the codebase is deliberately dense with those and they
are load-bearing. Do not add comments that restate the code.
