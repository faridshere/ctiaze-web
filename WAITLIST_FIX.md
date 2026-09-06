# Fixing the dropped signups (skopnix.com)

**Confirmed 2026-09-07 against production, twice over:**
  * `POST /api/waitlist` returns `503 "Early access isn't open just yet"`
  * the `signups` collection **does not exist** in Mongo — zero emails, ever

Cause: `MONGO_URI_WRITE` is unset in Vercel, so `writeDb()` returns null and the
route discards the submission. No code change is needed — the route, the write,
and the /admin dashboard are already shipped and correct.

Two env vars unlock it:
  MONGO_URI_WRITE  -> signups actually save
  ADMIN_TOKEN      -> /admin opens (it reads via the existing read-only URI,
                      so it needs no new database credential)

Already generated and stored in the login keychain:
  skopnix-admin-token       64-hex admin password
  skopnix-mongo-write-pw    32-char database password
  skopnix-mongo-write-uri   the assembled MONGO_URI_WRITE value

---

## Your part — two dashboard tasks

### A. Atlas: create the scoped write user

cloud.mongodb.com -> the project holding `Cluster1` -> Database Access
-> Add New Database User

    Authentication: Password
    Username:       skopnix_web
    Password:       paste (command below)
    Privileges:     "Specific Privileges" -> role readWrite, database ctiaze

Password onto the clipboard:

    security find-generic-password -a skopnix -s skopnix-mongo-write-pw -w | tr -d '\n' | pbcopy

Network access needs no change: the cluster already serves Vercel for the
read-only user and the IP access list is cluster-wide.

### B. Vercel: create an API token

vercel.com -> Account Settings -> Tokens -> Create Token
    Name:  skopnix-claude-ops
    Scope: the team that owns ctiaze-web
    Expiry: shortest that is convenient (it is only needed for this run)

Store it — it never has to be pasted anywhere else, or read by you:

    security add-generic-password -U -a skopnix -s skopnix-vercel-token -w

(that command waits for the token, then press return)

Revoke it in the same screen once the fix is verified.

---

## Claude's part, after A and B

    ./scripts/fix-waitlist.sh

which sets both env vars for production/preview/development via the Vercel API,
redeploys production, waits for READY, then runs `scripts/verify-waitlist.mjs`:
it solves the live proof-of-work, POSTs a genuine signup to skopnix.com, and
reads that row back out of Mongo through the independent read-only credential.
It exits non-zero if anything fails, so it cannot quietly look fine.

Test rows are named `probe+<timestamp>@skopnix.com` — delete them from /admin.

---

## Deliberately out of scope

Sending mail. skopnix.com has no MX, SPF, DKIM or DMARC, so nothing can be sent
from it yet. That is fine: this change only *collects* the list. When mail
hosting is bought, the early-access send is separate work, and a domain
registered in August 2026 needs warming before any bulk send or the invites
land in spam.
