# skopnix — operating plan (16 September 2026)

Status: decision document. Farid decided on 16 Sep 2026 to build skopnix.com as a real product with Claude Code, Cursor and Codex. This document is what every agent and every session should read before touching product, pricing, copy or pipeline scope. Where it conflicts with `MARKETING-PLAN-2026-2027.md` (8 Sep), this document wins; the kev-actor-map bet from that plan is kept, but as the data moat inside the product, not as the whole product.

Inputs, all dated 16 Sep 2026: repo and database audit; four research briefs (competitor pricing, payments and hosting from Azerbaijan, buyers and channels, VC comparables); a product-owner memo and a VC-analyst memo run over that research; a hostile review by Gemini 3.1 Pro. Disagreements between them are recorded in section 12 with the choice made.

---

## 0. Decisions Farid makes this week

Nothing in sections 4 to 7 starts until the first two are done.

- [ ] **Employment contract read.** Find the IP, outside-work and non-compete clauses. If the contract claims tooling built on personal time, get written clearance before launch. The employer is the state MSSP; treat this as a legal gate, not an HR formality. See section 9.
- [ ] **Time trade accepted.** skopnix needs 10 focused hours a week. Keep CRTO (owned, no deadline) and the AWS AI exam (January, and the Bedrock work overlaps). Push SecurityX to Q1 2027 if the voucher allows (check the expiry, it is still unknown). Stop the daily LinkedIn adversary series and park the documentary.
- [ ] **The one job approved** (section 2) and **pricing approved** (section 5).
- [ ] **Survival items.** Atlas card before 1 Oct; replace the atlasAdmin credential on the public site; rotate the pasted PAT. 30 minutes total.
- [ ] **Plumbing that needs your logins.** Mailbox on skopnix.com (Spacemail at Spaceship, about $1 a month); LinkedIn company page; AWS account to Paid plan then Activate application; Vercel Pro ($20 a month) or move `/api/*` to Cloudflare Workers, because Vercel Hobby forbids commercial use.

---

## 1. Where we stand, measured 16 Sep 2026

| Thing | Measured | Meaning |
|---|---|---|
| Wire items | 16,311, of which 8,474 are raw NVD entries | The archive is mostly public vulnerability records |
| Items carrying a CVE | 8,893 | Big, undifferentiated |
| KEV-flagged items | 141 | The exploited slice is small and valuable |
| Cited CVE-to-actor pairs | ~130 | The only scarce asset today, and it is small |
| Sources | 97, all English | Zero regional-language coverage |
| Actor records | 1,431 (about 100 rich enough to publish) | Depth is thinner than the count |
| Waitlist signups | 4 in 9 days (2 skopnix, 1 ctiaze, 1 actor page) | The email-for-a-promise CTA does not convert |
| Telegram | 39 subscribers | Only owned channel, tiny |
| Visits, 30 days | 996 rows, mostly Azerbaijan and US | Audience is regional, product is global |
| Infra cost | about $0 a month | Money is not the constraint |
| Shelved product | stacknix page + API + matcher, pricing page (Free / $49 / $199), developers page, IOC lookup, scan-me, exposure | A paid surface was built on 2 Sep and shelved |
| MCP | 4 read-only tools in ctiaze-dev (`get_recent_threats`, `get_recent_kev`, `search_threats`, `lookup_cve`) | Packaging exists |
| Census | Shodan count facets | Free feature only; never resold (guardrail from 26 Aug) |
| Sensors / honeypots | 0 lines of code | Not the business (section 12) |
| Payment rail | none | Polar.sh solves it (section 8) |

---

## 2. The one job

**For** small security teams and MSSP analysts who decide every week what to patch first without a $50k CTI contract, **skopnix is** an exploitability service **that** tells you which of *your* products and versions are exploited in the wild, by whom, with the report that proves it, **unlike** KEV and EPSS spreadsheets (no version match, no attribution), OpenCVE and Feedly (monitoring without exploit context, API gated to higher tiers) and VulnCheck (a free community tier or a $259,200 a year contract, nothing in between).

Why this job, from the research:

- The self-serve band is real and served by two-person companies: Pulsedive $29, Netlas $49, Shodan $69, Validin $399, SOCRadar from $3,950 a year. VulnCheck has no middle tier. That gap is the wedge.
- stacknix and the cited CVE-to-actor map are one product. The actor citation is the "by whom" line inside a stack result, and the report URL is the "says who".
- The paying user is a patch decision, not a reader. The wire, archive and dossiers stay as free marketing and SEO. They are not the product.

What skopnix is not: a news site, a Shodan reseller, a honeypot operator, or a vendor to Azerbaijani enterprises while Farid is employed by the state MSSP.

---

## 3. The data moat

Two things compound while everything else is packaging.

**3a. The cited attribution map.** One row = `cve_id`, `kev` (yes/no, date), `actor` (aliases, ATT&CK id), `confidence`, `first_seen`, `source_url`. Rows without a citation do not ship. Backfill the actor tagger over the whole archive (only 1,595 of the items carried actor tags on 8 Sep; the sparsity, not the data, is why there are ~130 pairs). Publish the map as a public GitHub dataset (`skopnix/kev-actor-map`, CC-BY-4.0, daily Action) for stars, backlinks and integrations, and serve the same rows inside stack results.

**3b. Regional-language coverage.** No self-serve or MCP vendor sells Russian, Turkish or CIS-region source coverage; the most-cited curated CTI list on GitHub (hslatman/awesome-threat-intelligence) contains zero such sources; Group-IB sells it enterprise-only. Feeds verified reachable on 16 Sep 2026 with `curl`:

| Region | Source | Feed | Items seen |
|---|---|---|---|
| RU | Kaspersky Securelist (RU) | https://securelist.ru/feed/ | 10 |
| RU | SecurityLab | https://www.securitylab.ru/_services/export/rss/ | 120 |
| RU | Habr infosec hub | https://habr.com/ru/rss/hub/infosecurity/all/?fl=ru | 40 |
| RU | Xakep | https://xakep.ru/feed/ | 10 |
| RU | Kaspersky ICS-CERT (RU) | https://ics-cert.kaspersky.ru/feed/ | 495 |
| TR | SOCRadar blog | https://socradar.io/feed/ | 10 |
| TR | ThreatMon blog | https://threatmon.io/feed/ | 10 |
| TR | Brandefense blog | https://brandefense.io/feed/ | 10 |
| AZ | CERT.AZ (EN and AZ) | https://cert.gov.az/en/rss , https://cert.gov.az/az/rss | 50 |
| UZ | UZCERT | https://uzcert.uz/feed/ | 10 |
| GE | CERT-GOV-GE | https://cert.gov.ge/ (feed returned, TLS check failed, verify) | 10 |
| IR | MAHER (cert.ir) | redirects to a feed, verify | 10 |

Not yet reachable as feeds (need a scraper or a different URL): BI.ZONE, Positive Technologies, F.A.C.C.T., Solar, anti-malware.ru, USOM (API-only since 1 Jun 2026 per secondary source), PRODAFT, KZ-CERT (Telegram `@certkznews`), TSARKA.

How it is sold: the regional layer is *not* the $39 pitch (Gemini is right that a small team patching Fortinet does not care who is exploiting it). It feeds two things: the "exploited by" and urgency lines inside stack results, and a Data licence tier for CTI vendors, AI-SOC startups and researchers who want coverage they cannot get elsewhere. It also makes the free dataset and the weekly brief unique, which is distribution.

---

## 4. Product surface (MVP)

Everything below is built from what already exists in `ctiaze-web`, `ctiaze-engine` and `ctiaze-dev`.

**Story 1: check a stack.** Re-enable `app/_disabled/stacknix`, `app/_disabled/api-stacknix/route.ts`, `lib/_disabled/stacknix.ts`, English only. Inputs: pasted `product version` lines, **CycloneDX or SPDX JSON upload**, and a **CLI** (`npx skopnix check` or `pipx run skopnix`) that reads `package.json`, `requirements.txt`, `go.mod`, `Dockerfile` base images and an `osquery`-style inventory CSV. The paste box alone is a toy; the CLI and SBOM path make it repeatable.
Accept: 5 components free; version-range adjudication passes 20 golden NVD cases (the `virtualMatchString` trap is known: NVD does not filter versions, the matcher must); response under 3 s; JSON export.

**Story 2: watch a stack.** New `stack_watch` job in `ctiaze-engine` on the existing 2-hourly cron.
Accept: email or webhook within 24 h when a watched version gets a new KEV entry, a new cited actor, or EPSS crosses 0.5; each alert carries CVE, product, version range, KEV date, report URL; no duplicate alerts (mongomock test).

**Story 3: exploited by, with citation.** On every stack row and every `/cve/[id]` page, from `items.entities.threat_actors` plus the backfilled map.
Accept: no attribution row without a `source_url`.

**Story 4: the same answers by key.** `/api/v1` plus the dev-portal MCP with a new `check_stack` tool.
Accept: key issued by the checkout webhook into Unkey; quotas enforced; HTTP 402 on overage.

**Story 5: checkout.** Polar.sh (individual seller, Azerbaijan supported, Stripe Connect payouts). Re-enable `app/_disabled/pricing` with the numbers in section 5.

**Delete or keep shelved:** `scan-me`, `api-pwned`, `api-ioc-enrich`, `exposure` (Shodan resale), `sectors`, `situation`, `glossary`, `vendor`, `attacks`, all Azerbaijani copy on product pages, the email waitlist CTA. Keep the wire, archive and actor dossiers.

**Fix first (conversion):** the CTA trades an email for a promise, replace it with the instant free check; the headline sells news ("read off the wire"), say the job ("Is your stack exploitable right now?"); nothing is for sale and the copy says API and MCP are "coming", ship the price and remove every "coming".

---

## 5. Pricing

| Tier | Price | Includes | Anchor |
|---|---|---|---|
| Free | $0 | 5 components, 3 checks a day, public feed, read-only MCP with limits | Acquisition |
| Builder | $39 a month | 50 watched components, alerts, 25k API calls, full MCP, commercial use | Above Pulsedive $29 (a watched stack is closer to the patch decision), below Netlas $49 |
| Team | $149 a month | 500 components, 5 seats, client-labelled stacks for MSSPs, webhooks, CSV | Clears a corporate card without approval; far under Validin $399 and SOCRadar $3,950 a year |
| Data licence | from $299 a month | Regional-language coverage and attribution feed, bulk export, OEM use, for CTI vendors, AI-SOC startups, researchers | The moat, sold to people who value coverage |

Annual at ten months. Founding offer: $19 a month locked for the first 20 paying accounts in exchange for a 20-minute call. Polar takes 5% plus 50 cents, so $39 nets $36.55.

---

## 6. Six weeks, ten hours a week

Order revised after the hostile review: launch the free surface before writing billing code, and write billing only when checks and watch requests show up.

| Week | Ship | Claude Code | Codex | Cursor |
|---|---|---|---|---|
| 1 | Free stacknix live on the landing page: paste + SBOM upload, "exploited by" line, JSON export. Waitlist CTA gone. | Re-enable and harden the matcher and route | 20 golden version-range cases, test suite, adversarial review of the matcher | Result table and landing copy in the browser |
| 2 | CLI (`npx skopnix check`) + `check_stack` MCP tool. Listings: official MCP registry, Glama, Smithery. First launch: Show HN, r/blueteamsec, Curated Intelligence and DFIR Discords. | CLI package + MCP tool over the existing server | CLI tests, packaging, README | Developers page re-enabled |
| 3 | Regional feeds into the pipeline (the 10 verified above) with translation in the relevance pass on Bedrock credits. `skopnix/kev-actor-map` repo with daily Action, CC-BY-4.0, CONTRIBUTING with citation rule. | Engine adapters, translation prompt, map export job | Feed parser tests with fixtures, mongomock | README table, SOURCES.md |
| 4 | Actor tagger backfill over the archive. Watched stacks + alerts (email, webhook). | Engine `stack_watch` job, alert de-duplication | Duplicate-alert and schema tests | Saved-stack UI |
| 5 | Polar checkout, Unkey keys and quotas, pricing page live. MISP default-feed PR, OpenCTI connector, XSOAR community content pack (Farid knows XSOAR). | Webhook to key flow, quota middleware | Gating tests, 402 paths | Pricing page, account page |
| 6 | Second launch: Product Hunt, tl;dr sec and Unsupervised Learning submissions, n8n community node, Dropzone "Custom Threat Intel" outreach, ten targeted messages a week to MSSPs and AI-SOC teams, one LinkedIn post that ends at the free check. | Bug fixes from launch | Review every merge | Polish |

Tool roles: Claude Code for cross-repo features and anything touching the pipeline; Codex for tests and adversarial review of every merge; Cursor for UI iteration in the browser. Every session leaves a file; no week ends without a shippable increment.

---

## 7. Distribution: how sales actually happen

- **Product-led.** The free check and the CLI are the funnel. Rate limits, not emails, create the upgrade moment.
- **Listings that accept a small vendor for free:** MISP default feeds (PR to `MISP/MISP` `defaults.json`), OpenCTI connectors repo, Cortex XSOAR marketplace (submit from the UI, community-supported tier), n8n community node (published via GitHub Actions for the verified badge), official MCP registry, Glama, Smithery, Elastic integrations later.
- **Direct outreach, specific and small:** ten messages a week. Targets: AI-SOC vendors whose integration pages list custom intel (Dropzone AI lists a "Custom Threat Intel" category and takes any webhook source), small MSSPs in DACH, Nordics, Poland, Baltics and Turkey with exposure to CIS-region threats, and CTI vendors who lack regional coverage.
- **Content that is a by-product of the data:** a weekly brief, "what Russian and Turkish sources reported this week that English feeds did not", ending at the free check. One LinkedIn post a week, not daily.
- **Talks:** SANS CTI Summit (1 to 2 Feb 2027), FIRST CTI, Botconf (28 to 30 Apr 2027), x33fcon, BSides Prague. Same talk everywhere: what 16k reports and 12 regional sources say about who exploits what.
- **Not:** Azerbaijani enterprise sales while employed by the state MSSP; LinkedIn reactions as a metric; the 27 Oct conference room as a sales floor (use it for five research questions).

---

## 8. Costs and credits

| Item | Monthly | Note |
|---|---|---|
| Vercel Pro (or Cloudflare Workers for `/api`) | $20 (or $0 to $5) | Hobby forbids commercial use |
| MongoDB Atlas | $0 now, Flex $8 to $30 when needed | M2/M5 retired; Flex capped at $30 |
| Mailbox | $1 | Spacemail |
| Unkey | $0 | 150k verifications a month free |
| Polar | 5% + $0.50 per transaction | No monthly fee |
| Regional VPS (optional research node) | $3.44 to $7 | turkvps.cloud, hoster.kz |
| LLM | $0 to $20 overflow | Bedrock on AWS Activate credits |
| **Total** | **$25 to $80** | Three Builder customers cover it |

Credits: AWS Activate Founders $1,000 (Paid plan + skopnix mailbox required) for Bedrock and later the API gateway; Microsoft $1,000 (do not redeem until there is a use, 90-day clock; the extra $4,000 needs a registered entity); Google Start $2,000 (park); MongoDB Inspire (apply after the LinkedIn page exists).

---

## 9. Employer, legal, entity

- **Read the contract first.** Look for IP assignment, outside-employment and non-compete clauses. A state-owned employer may claim tooling regardless of hours. If any clause is ambiguous, ask for written clearance from leadership before launch. Do not rely on a private clean-room rule alone.
- **Clean-room rule anyway:** no employer code, data, customer names or tenant facts in skopnix; personal accounts, personal hardware, personal hours; the Cortex inventory and triage scripts written for work are not copied, the public method (NVD, KEV, EPSS, CPE ranges) is re-implemented from public specs.
- **Global self-serve only.** No sales to Azerbaijani enterprises while employed by the state MSSP. This was the 26 Aug decision for sales reasons; it is also the legal reason.
- **Entity:** not for credits. Register when someone is about to pay or when a buyer asks for an invoice. Options: Azerbaijani MMC (about 200 AZN a month fixed, KOBİA three-year clock starts at issuance) or Delaware via Stripe Atlas ($500 once, about $500 a year, gives Stripe access and a trust wrapper for global buyers). Decide at first revenue, not before.

---

## 10. Prove or kill, 60 days after week 6

| Metric | Threshold |
|---|---|
| Free stack checks from outside Azerbaijan | 200 or more |
| Checks returning at least one KEV hit | 40% or more (otherwise the matcher is not finding real pain) |
| Paying accounts | 5 or more, at least $150 MRR |
| Day-30 churn of the first cohort | under 20% |
| MCP installs | 25 or more |
| `kev-actor-map` stars | 50 or more |
| Regional sources live with 60 days of history | 10 or more |

Kill: fewer than 3 payers and fewer than 100 checks. Then skopnix becomes the free dataset plus the regional wire, product building stops, and the asset is a career and talk asset. Both outcomes are acceptable; not deciding is not.

---

## 11. Time budget

10 hours a week: 4 product (the week's increment), 3 data (feeds, tagger, map review), 2 distribution (ten messages, listings), 1 measurement. Stops: daily adversary posts, documentary, redesigns, new pillars, sensors beyond one research node, sources beyond the regional set.

---

## 12. Disagreements recorded

- **PO said** lead with stacknix as the paid job; **VC said** lead with the data asset and do stacknix second, after the employer question. **Chosen:** one product. stacknix is the reason to pay, the cited map and regional coverage are why it is defensible; both are built in the same six weeks because they share the pipeline. The employer gate applies to both.
- **VC and Gemini (8 Sep and 16 Sep) said** sensors are a trap. **Earlier session (15 Sep) said** build one honeypot in 14 days. **Chosen:** sensors are not the business. One research node is optional and must not take product hours.
- **Gemini said** billing code before demand is waste. **PO put** money plumbing in week 1. **Chosen:** free surface and launch first (weeks 1 to 2), billing in week 5.
- **Gemini said** "paste your stack" is a toy. **Chosen:** add SBOM upload and a CLI in weeks 1 to 2; watch and alerts are what people pay for.
- **Gemini said** the regional angle does not make a $39 buyer pay. **Chosen:** agreed; it is the Data licence tier and the distribution engine, not the Builder pitch.
- **Gemini said** a clean-room rule is naive with a state employer. **Chosen:** contract read and written clearance are gate items in section 0.

---

## 13. Guardrails for any agent working in these repos

1. Read the repo's `CLAUDE.md` and `OVERNIGHT_BACKLOG.md` first; their standing permissions and cost rules still apply.
2. No employer code, data or names. Public specs only for the matcher.
3. No attribution row without a source URL. No Shodan resale. No sensor grid.
4. Product pages are English only; the Azerbaijani wire stays on ctiaze.tech.
5. Every change is verified, not "should work": tests green, and a real local or CI run for anything touching the pipeline.
6. No new paid services without Farid's approval. Credits are for skopnix, not for personal labs.
7. The free check must never require an email. The wire, archive and dossiers are marketing, not the product.
