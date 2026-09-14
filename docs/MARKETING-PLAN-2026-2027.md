# skopnix — 12-month marketing plan

Written 2026-09-08. Every number in "What the data says" was measured, not estimated.
Re-measure before each quarterly gate; if the numbers moved, change the plan, not the numbers.

---

## 1. What the data actually says

Measured 2026-09-08 against the production Mongo (`ctiaze` db) and the live site.

| Thing | Measured | So what |
|---|---|---|
| Email signups, all time | **1** — and it is Farid's own test address | Real conversion is **0%** |
| Unique human IPs since the beacon went live (6 Sep) | ~120 | Sample is small but not zero |
| Visits on 7 Sep (one LinkedIn post) | 233 / 86 unique IPs | One post = the entire traffic history |
| Visits on 8 Sep | 23 | The spike decays to nothing in 24h |
| Referrers | 267 null, Google 13, Instagram 5, LinkedIn 3 | Attribution is broken; 89% unattributed |
| Countries | AZ 177, US 97, FR 7, DE 4 | Audience is regional; the product is positioned global |
| Bot share | 69 of 299 hits | ~23% of "traffic" is crawlers |
| Telegram | 38 subscribers | The only owned channel, and it is tiny |
| Wire items | 13,699 (7,521 carry a CVE id, 120 flagged KEV) | Big, and completely undifferentiated |
| Actor records | 1,428 (only 100 are rich enough to publish) | Depth is thinner than the count suggests |
| Items tagged with BOTH a CVE and an actor | **119 items → 130 distinct CVE↔actor pairs** | The one genuinely scarce asset, and it is small today |

**The single most important line in that table:** ~120 real humans arrived and not one of them
gave an email address.

---

## 2. Diagnosis

**a) The offer is a promise, not a thing.** The CTA says early access "opens the actor API, an
MCP server, alerts and STIX export… one email when it's ready." Nobody trades an email for a
maybe from a two-week-old site they have never heard of. There is nothing you *get* today.

**b) The product is aggregation, and aggregation is free everywhere.** 13,699 items from 66
public sources competes with Feedly, OTX, abuse.ch, tl;dr sec and a hundred RSS readers. Item
number 13,700 is worth nothing. This was already written down as a guardrail on 2026-08-26 —
"going global only works if he sells proprietary data, NOT republished free CVE/NVD/CISA
content" — and the site as shipped violates it.

**c) The distribution is pointed at the wrong people.** LinkedIn is 46% Baku and 35%
entry-level, and the traffic confirms it: AZ 177 vs US 97. Those visitors have no CTI budget and
no operational need. Global detection engineers and CTI leads are on GitHub, Bluesky/Mastodon
infosec, the Curated Intelligence and DFIR Discords, r/blueteamsec and a handful of newsletters
— none of which have been touched.

**d) Six initiatives, ten hours.** Wire + actor dossiers + daily APT posts + weekly carousel +
video series + Carbanak documentary + CyberHackCon + a job interview. At 10 h/week nothing
reaches the quality bar that makes a stranger care.

A second opinion (Gemini 3.5) was asked to attack this diagnosis independently and reached the
same three conclusions, adding one worth keeping: **honeypot sensors are a trap** — unverifiable
data from an unknown operator buys no trust, and it turns a 10 h/week founder into an unpaid
sysadmin. That kills the "proprietary regional sensor grid" idea from the August plan.

---

## 3. The one bet

> **Stop marketing a news site. Ship one dataset that other people's tools depend on.**

Concretely: **`skopnix/kev-actor-map`** — a public GitHub repo, rebuilt daily by GitHub Actions,
that answers one question nobody answers cleanly for free:

**"This CVE is being exploited — by *whom*, and what report says so?"**

One row = `cve_id` · `kev` (yes/no + date added) · `actor` (+ aliases, ATT&CK group id) ·
`confidence` · `first_seen` · **`source_url` — the exact report that makes the claim**.
Published as JSON + CSV + a rendered README table, MIT/CC-BY, no key, no signup, no rate limit.

**Why this and not the alternatives**

- *A weekly newsletter* — 4–6 h/week of reading and writing, against tl;dr sec, Risky Business
  and Unsupervised Learning who do it full time. Loses on time budget alone.
- *Honeypot sensors* — see above. Ops cost, zero trust, burns the whole $2k.
- *The actor-dossier series as the product* — Mandiant, CrowdStrike and Red Canary publish the
  same thing with 100× the budget. It brings students, not users. (It stays, but as *marketing*,
  not as the product.)
- *A free web tool* — a solo maintainer's web app competing with Shodan and VirusTotal ends up
  an abandoned toy.
- *The dataset* — engineers `curl` a raw GitHub URL into a SIEM enrichment pipeline and then
  never remove it. Stars, forks and integrations are durable, they generate backlinks (which is
  also the only SEO that will work on a two-week-old domain), and GitHub Actions costs $0.

**The honest catch, stated up front:** the join exists today for **130 pairs**. That is a
starting inventory, not a product. Which is exactly what Q1 is for.

**Why it is defensible:** VulnCheck sells this. MITRE ATT&CK has it partially and slowly. The
scarce part is not the CVE list — it is the *citation*. Every row carries the URL of the report
that made the claim, and rows without a citation do not ship. That rule is the moat and the
brand: **skopnix rows are checkable.**

---

## 4. Stop doing (this quarter, not "eventually")

1. **The Carbanak documentary.** Hundreds of hours, converts nobody to a data product. Finish it
   in 2027 or never. This is the single biggest time recovery available.
2. **Daily "APT of the day" posts.** It already contradicts the logged rule (2–4/week, never 2×
   in 24 h, the ranker reads topic consistency). Drop to **one** post a week.
3. **Building the MCP server, private API, alerts and STIX export.** Audience of zero. Do not
   write another line until someone asks by name. (Already removed from the homepage copy.)
4. **Adding sources to the wire.** 66 is plenty. Every hour spent fixing scraper 67 is an hour
   not spent on the mapping.
5. **Treating LinkedIn likes as progress.** 50 reactions from Baku students is not demand.

That frees roughly **6 of the 10 hours**.

---

## 5. Phase 0 — the next 14 days (before any campaign)

Nothing below is growth work. It is stopping the bucket from leaking.

- [ ] **Pay the Atlas bill.** Billing is failing and the org suspends **1 Oct 2026**. If the
      database dies, all of this is moot. This is item zero.
- [ ] **Replace the CTA.** From "one email when early access opens" to something delivered now:
      *"Get an email the moment a CVE you can't patch yet gets tied to a named actor. Roughly
      one a week. Nothing else."* One promise, immediate, narrow, and it is the dataset's
      by-product — no extra work to fulfil.
- [ ] **Fix attribution.** 89% of referrers are null. Put `?src=` on every link posted anywhere
      (the beacon already stores `src`); use a distinct value per channel. Without this the
      whole year is unmeasurable.
- [ ] **Short vanity paths for every push** (the `/turtle` pattern already works). The URL lives
      inside the image, never in the post body — LinkedIn penalises links in body ~19%.
- [ ] **Kill the bot noise in the numbers.** 23% of hits are crawlers; filter them out of the
      admin dashboard so decisions use real traffic.
- [ ] **Decide the licence** (CC-BY-4.0 for the data is the safe default) and write
      `SOURCES.md` — provenance is the product.

---

## 6. The year, in four gates

Each quarter has **one** objective and a **kill criterion**. Miss the gate twice in a row and
the bet is wrong — change it rather than working harder at it.

### Q1 · Oct–Dec 2026 — *Build the asset and make it citable*

**Objective:** `kev-actor-map` exists, updates itself daily, and 10 real practitioners outside
Azerbaijan have used it.

Work:
1. **Backfill the actor tagger over the whole archive.** Only 1,595 of 13,699 items carry actor
   tags today — that sparsity, not the data, is why there are only 130 pairs. This is the one
   engineering task worth real hours this quarter.
2. Seed from the obvious free sources: CISA KEV, ATT&CK group→software→CVE chains, the DFIR
   Report, ransomware.live, vendor advisories already in the wire.
3. Ship the repo: daily Action, `data/*.json` + `*.csv`, a README table of the last 30 days,
   `CHANGELOG` of new mappings, a `CONTRIBUTING.md` that accepts a mapping PR with a citation.
4. First distribution — **cold, specific, no spray**: submit to tl;dr sec, Unsupervised
   Learning, and the ATT&CK/CTI Discords and r/blueteamsec with the one-line pitch *"free daily
   CVE→threat-actor mapping, every row cites the report"*. Ten targeted messages, not a hundred.
5. LinkedIn drops to 1 post/week, and every post ends at the dataset, not at a dossier.

**Gate (31 Dec 2026):** ≥ 400 published mappings · ≥ 50 GitHub stars · ≥ 30 email subscribers
who are **not** in Azerbaijan · ≥ 1 mention in a newsletter or repo you do not control.
**Kill criterion:** fewer than 15 stars and zero external mentions → the dataset is not wanted;
go back to section 3 and pick again.

### Q2 · Jan–Mar 2027 — *Be depended on*

**Objective:** somebody else's code calls your data on a schedule.

- Publish a tiny client (`pip install skopnix` / a Sigma-friendly CSV) — adoption friction is
  the whole game.
- Get into one integration: an OpenCTI/MISP connector, a Sigma or Nuclei community repo, or a
  detection-engineering template someone else maintains.
- CFP season is here and it is free reach: **SANS CTI Summit** and **FIRST CTI** (opened Sept
  2026), **Botconf** (closes 3 Jan 2027), **x33fcon** (~Feb 2027), **BSides Prague** (Apr 2027).
  Submit the same talk to all five: *"What 13,000 threat reports say about who exploits what —
  and how often the attribution disagrees."* That talk is a by-product of the dataset.
- Start the email list properly: one message per week, and it is the diff — *what got mapped
  this week*. Written in 20 minutes because the data wrote it.

**Gate (31 Mar 2027):** ≥ 200 stars · ≥ 150 subscribers · ≥ 1 third-party tool consuming the
feed · ≥ 1 CFP accepted or shortlisted.

### Q3 · Apr–Jun 2027 — *Compound and test money*

**Objective:** find out whether anyone will pay, cheaply and without building anything.

- SEO finally works by now: the actor pages and CVE pages have had 6+ months and real backlinks
  from the repo. Measure organic, and only then invest in on-page work.
- **Test price with a landing page, not a product**: a commercial-use licence + a webhook when a
  CVE in *your* stack gets mapped, $49/mo. If ten people click "buy" and nobody completes,
  that is still the answer.
- Speak at whatever accepted. Record it. That recording is next quarter's marketing.

**Gate (30 Jun 2027):** ≥ 400 stars · ≥ 350 subscribers · ≥ 500 organic visits/month ·
**≥ 3 people who have entered card details**, not signed a waitlist.

### Q4 · Jul–Sep 2027 — *Either it pays or it is a portfolio*

**Objective:** an honest verdict.

Two acceptable outcomes, and it is fine to choose the second:
1. **Revenue:** 5–10 paying accounts at $49–99/mo, or one $300–500/mo sponsor of the dataset.
2. **Career:** the dataset and the talks are the strongest possible evidence in a hiring
   conversation, and the return is a senior detection-engineering role at multiples of the
   local salary.

**Gate (30 Sep 2027):** ≥ 800 stars · ≥ 600 subscribers · ≥ $300 MRR **or** a named inbound
opportunity that would not have existed without skopnix.

---

## 7. The forecast, stated as a bet

These are what I would actually bet on from a standing start of 1 signup and 38 Telegram
subscribers — not aspirations. Gemini, asked independently, forecast higher (150 stars at month
3, 1,000–1,500 at month 12); I think that assumes more than 10 hours a week. If the Q1 gate is
beaten comfortably, revise upward.

| | M3 (Dec 26) | M6 (Mar 27) | M12 (Sep 27) |
|---|---|---|---|
| GitHub stars | 50 | 200 | 800 |
| Email subs (non-AZ) | 30 | 150 | 600 |
| Organic visits/mo | ~100 | ~250 | ~1,200 |
| Third-party integrations | 0 | 1 | 3 |
| Revenue | $0 | $0 | $300/mo or a job |

---

## 8. The week, in ten hours

| Hours | What | Non-negotiable because |
|---|---|---|
| 4 | Dataset: tagging, backfill, mapping review, the daily Action | It is the only asset |
| 2 | Distribution: 10 targeted messages, comments where practitioners actually are | Reach is manual until the repo earns its own |
| 2 | One LinkedIn post + its graphic | Reuse the dossier machinery already built |
| 1 | The weekly email (the diff) | The data writes it |
| 1 | Measure: re-run the analytics query, update the scoreboard | Otherwise the year is unfalsifiable |

Note what is **not** in the table: the wire runs itself, and it stays that way.

---

## 9. Budget — $2,000

| Item | Year |
|---|---|
| Mongo Atlas (**pay this now** — suspension 1 Oct) | ~$300 |
| Domain + Vercel | ~$100 |
| Email sending (Buttondown/Resend, free to ~1k subs) | $0–100 |
| One conference trip if a CFP lands (budget flights only) | ~$900 |
| Reserve for a paid dataset that improves the mapping | ~$400 |
| Ads | **$0** — paid acquisition into a 0%-converting funnel is setting money on fire |

---

## 10. How this fails

1. **Burnout from context-switching.** Full-time SOC + job interview + conference + documentary
   + this. The Stop list in section 4 is not optional; it is the plan's load-bearing wall.
2. **Mistaking Baku LinkedIn engagement for demand.** 50 likes is not a user. The only metric
   that counts in Q1 is *non-AZ* subscribers and stars from strangers.
3. **Sunk-cost on the wire.** 13,699 items feels like the product because it took the longest.
   It is the raw material. If a quarter goes by fixing scraper 67, the year is lost.
4. **Shipping a mapping without a citation.** One wrong attribution under his own name, in a
   field where attribution is contested, costs more credibility than the whole dataset earns.
   The ≥1-citation rule is absolute. (Precedent: Gemini asserted a SEA-ME-WE victim that was
   never confirmed, and the UNC1549 deck asserted the opposite of the truth — both caught only
   because they were checked at the primary source.)

---

## Appendix — how to re-measure

The analytics used here are one Mongo query away; the script pattern is in the session log.
Counts to re-run before every gate: `signups` total and non-AZ share, `visits` by day / country
/ ref / src with bots excluded, `items` with both `cve_ids` and `actors` (the mapping
inventory), Telegram subscriber count from the public channel page, and GitHub stars.
