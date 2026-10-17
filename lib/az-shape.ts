import type { CitedActor, TrendingCard } from "./exploit-shape";

// ---------------------------------------------------------------------------
// The Azerbaijan threat dashboard: the pure half. Everything here shapes rows
// the engine wrote (hacktivist_posts, az_adversaries, az_exposure, the
// exploit_trending board) into what /az and /api/v1/az print. No database, no
// Next, no "@/" imports (type imports only), so tests/az-shape.test.ts runs it
// on fixtures.
//
// What is public and what is not, enforced here a second time even though the
// queries already filter, so a shape change upstream cannot leak:
//   • claims come from telegram, bluesky and ransomware leak-site listings only;
//     dark-web (ahmia / onion) rows never leave the private review channel;
//   • breach exposure is a LISTING: who was named, by whom, when. No stolen
//     values, no sample rows, no links to a dump or a leak page;
//   • an adversary or an exploit attribution is printed only with a quote and an
//     https source, never on our say-so;
//   • anything that looks like personal data (an e-mail address) drops the row.
// ---------------------------------------------------------------------------

type DateLike = Date | string | null | undefined;

const PUBLIC_KINDS = new Set(["telegram", "bluesky", "ransomware"]);
const DARK_RE = /\b(dark ?web|darkweb|ahmia|onion|tor)\b|\.onion\b/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const URL_RE = /\bhttps?:\/\/\S+/gi;

export function isoOf(v: DateLike): string | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function str(v: unknown, max = 160): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(URL_RE, "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

function strList(v: unknown, max = 8): string[] {
  const arr = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;]/) : [];
  const out: string[] = [];
  for (const x of arr) {
    const s = str(x, 60);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

// Only plain https links leave the site, and never one to an onion.
export function safeHttps(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try {
    const p = new URL(u);
    if (p.protocol !== "https:" || p.hostname.endsWith(".onion")) return null;
    return p.toString();
  } catch {
    return null;
  }
}

export function hostOf(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

// ---- 1. campaigns ----------------------------------------------------------

export type Verdict = "up" | "filtered" | "unreachable" | "unchecked";

export type CheckInput = { target: string; here: string; checkhost: string };

// The same reading as the /claims ledger: "up" when the target answered us,
// "filtered" when it answered us but none of the global nodes (geo or anti-DDoS
// filtering, usually), "unreachable" otherwise.
export function checkVerdict(c: { here?: string | null; checkhost?: string | null }): Exclude<Verdict, "unchecked"> {
  const here = c.here ?? "";
  const up = here.startsWith("HTTP 2") || here.startsWith("HTTP 3");
  if (up && (c.checkhost ?? "").startsWith("0/")) return "filtered";
  if (up) return "up";
  return "unreachable";
}

/** The subset of lib/claims.ts ClaimRow this module reads. */
export type CampaignInput = {
  kind: string;
  group: string;
  url: string;
  at: string;
  claimType: string | null;
  targets: string[];
  checks: CheckInput[];
};

export type Campaign = {
  group: string;
  target: string;
  claimTypes: string[];
  kinds: string[];
  claims: number;
  first: string;
  last: string;
  /** Our check of the target on the newest claim that named it. */
  verdict: Verdict;
  sources: string[];
};

export const NO_TARGET = "target not named";

// Claims of the last `days`, one entry per claimant and target, newest first.
// A post naming three sites counts once against each of them.
export function groupCampaigns(rows: CampaignInput[], now: Date, days = 7, limit = 40): Campaign[] {
  const since = now.getTime() - days * 86_400_000;
  const map = new Map<string, Campaign & { verdictAt: number }>();
  for (const r of rows) {
    if (!PUBLIC_KINDS.has(r.kind)) continue;
    const t = Date.parse(r.at);
    if (!Number.isFinite(t) || t < since || t > now.getTime() + 3_600_000) continue;
    const group = str(r.group, 80) ?? "unknown";
    const targets = r.targets.map((x) => hostOf(x)).filter(Boolean);
    for (const target of targets.length ? [...new Set(targets)] : [NO_TARGET]) {
      const key = `${group.toLowerCase()}\u0000${target}`;
      let c = map.get(key);
      if (!c) {
        c = { group, target, claimTypes: [], kinds: [], claims: 0, first: r.at, last: r.at, verdict: "unchecked", sources: [], verdictAt: -Infinity };
        map.set(key, c);
      }
      c.claims += 1;
      if (t < Date.parse(c.first)) c.first = r.at;
      if (t > Date.parse(c.last)) c.last = r.at;
      if (r.claimType && !c.claimTypes.includes(r.claimType)) c.claimTypes.push(r.claimType);
      if (!c.kinds.includes(r.kind)) c.kinds.push(r.kind);
      const src = safeHttps(r.url);
      if (src && !c.sources.includes(src) && c.sources.length < 3) c.sources.push(src);
      const check = r.checks.find((k) => hostOf(k.target) === target);
      if (check && t > c.verdictAt) {
        c.verdict = checkVerdict(check);
        c.verdictAt = t;
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => Date.parse(b.last) - Date.parse(a.last) || b.claims - a.claims)
    .slice(0, limit)
    .map((c) => ({ group: c.group, target: c.target, claimTypes: c.claimTypes, kinds: c.kinds, claims: c.claims, first: c.first, last: c.last, verdict: c.verdict, sources: c.sources }));
}

// ---- 2. adversaries --------------------------------------------------------

export type CitationIn = { quote?: string | null; url?: string | null; source?: string | null };

export type AdversaryDoc = {
  _id?: unknown;
  name?: string | null;
  actor_id?: string | null;
  aliases?: string[] | null;
  alignment?: string | null;
  motivation?: string | null;
  kind?: string | null;
  targets?: string[] | string | null;
  sectors?: string[] | string | null;
  target_sectors?: string[] | string | null;
  credibility?: string | number | null;
  citations?: CitationIn[] | null;
  quote?: string | null;
  source_url?: string | null;
  claims_count?: number | null;
  last_seen?: DateLike;
};

export type Citation = { quote: string; url: string; source: string };

export type Adversary = {
  id: string;
  name: string;
  aliases: string[];
  alignment: string | null;
  hits: string[];
  credibility: string | null;
  /** /actors/<id> when we hold a dossier for this group, else null. */
  dossier: string | null;
  citation: Citation;
  claims: number | null;
  lastSeen: string | null;
};

export function credibilityWord(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const x = v > 1 ? v / 100 : v;
    return x >= 0.7 ? "high" : x >= 0.4 ? "medium" : "low";
  }
  return str(v, 40)?.toLowerCase() ?? null;
}

function firstCitation(d: AdversaryDoc): Citation | null {
  const all: CitationIn[] = [...(d.citations ?? []), { quote: d.quote, url: d.source_url }];
  for (const c of all) {
    const quote = str(c?.quote, 300);
    const url = safeHttps(c?.url);
    if (quote && url) return { quote, url, source: str(c?.source, 60) ?? hostOf(url) };
  }
  return null;
}

// One card per group that carries a quote and a source. A group with no
// citation is not printed (no attribution without a link): it is counted, so
// the page can say how many were held back.
export function shapeAdversaries(docs: AdversaryDoc[], dossierIds: Set<string> = new Set()): { cards: Adversary[]; withheld: number } {
  const cards: Adversary[] = [];
  const seen = new Set<string>();
  let withheld = 0;
  for (const d of docs) {
    const name = str(d.name, 80);
    if (!name || seen.has(name.toLowerCase())) continue;
    if (d.kind && DARK_RE.test(d.kind)) continue;
    const citation = firstCitation(d);
    if (!citation) {
      withheld += 1;
      continue;
    }
    seen.add(name.toLowerCase());
    const actorId = typeof d.actor_id === "string" && d.actor_id.trim() ? d.actor_id.trim() : null;
    cards.push({
      id: String(d._id ?? actorId ?? name),
      name,
      aliases: strList(d.aliases, 4).filter((a) => a.toLowerCase() !== name.toLowerCase()),
      alignment: str(d.alignment, 60) ?? str(d.motivation, 60),
      hits: strList(d.targets ?? d.sectors ?? d.target_sectors, 6),
      credibility: credibilityWord(d.credibility),
      dossier: actorId && dossierIds.has(actorId) ? `/actors/${encodeURIComponent(actorId)}` : null,
      citation,
      claims: typeof d.claims_count === "number" && Number.isFinite(d.claims_count) ? d.claims_count : null,
      lastSeen: isoOf(d.last_seen),
    });
  }
  cards.sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "") || a.name.localeCompare(b.name));
  return { cards, withheld };
}

// ---- 3. breach / leak exposure ---------------------------------------------

export type ExposureDoc = {
  _id?: unknown;
  org?: string | null;
  org_name?: string | null;
  victim?: string | null;
  sector?: string | null;
  claim_type?: string | null;
  group?: string | null;
  status?: string | null;
  kind?: string | null;
  source?: string | null;
  published?: DateLike;
  first_seen?: DateLike;
  // Anything else the engine stores (samples, links, file lists) is never read.
};

export type ExposureListing = {
  id: string;
  org: string;
  sector: string | null;
  claimType: string | null;
  group: string | null;
  status: string | null;
  at: string | null;
};

// Listings only, newest first. A row from a dark-web source, or one whose org
// field holds an e-mail address or a link, is dropped rather than cleaned up:
// a field that already held the wrong thing is not trusted for the rest.
export function shapeExposure(docs: ExposureDoc[], limit = 60): ExposureListing[] {
  const out: ExposureListing[] = [];
  for (const d of docs) {
    if ((d.kind && DARK_RE.test(d.kind)) || (d.source && DARK_RE.test(d.source))) continue;
    const raw = d.org ?? d.org_name ?? d.victim;
    if (typeof raw !== "string" || EMAIL_RE.test(raw) || /https?:\/\/|\.onion\b/i.test(raw)) continue;
    const org = str(raw, 100);
    if (!org) continue;
    out.push({
      id: String(d._id ?? org),
      org,
      sector: str(d.sector, 60),
      claimType: str(d.claim_type, 40),
      group: str(d.group, 80),
      status: str(d.status, 40),
      at: isoOf(d.published ?? d.first_seen),
    });
  }
  return out.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "")).slice(0, limit);
}

// ---- 4. exploited now, relevant to Azerbaijan ------------------------------

export type AzReason = "az-actor" | "az-exposure" | "kev";

export const REASON_TEXT: Record<AzReason, string> = {
  "az-actor": "used by a group that targets Azerbaijan",
  "az-exposure": "the affected product is exposed in Azerbaijan",
  kev: "on CISA's known-exploited list",
};

export type AzExposureHit = { product: string; count: number; asOf: string | null };

export type AzExploit = {
  cve: string;
  title: string | null;
  kev: boolean;
  epss: number | null;
  why: AzReason[];
  exposure: AzExposureHit | null;
  /** Every actor here carries its own quote and https source. */
  actors: CitedActor[];
};

// From the week's trending board, the CVEs that matter here, with why. A CVE
// with no reason is left out; an actor without a sourced citation never shows.
export function selectAzExploits(
  cards: TrendingCard[],
  azActorIds: Set<string>,
  exposure: Map<string, AzExposureHit> = new Map(),
  limit = 12,
): AzExploit[] {
  const out: AzExploit[] = [];
  for (const c of cards) {
    const actors = c.actors.filter((a) => a.url && a.quote);
    const why: AzReason[] = [];
    if (actors.some((a) => azActorIds.has(a.id))) why.push("az-actor");
    const hit = exposure.get(c.cve) ?? null;
    if (hit && hit.count > 0) why.push("az-exposure");
    if (c.kev) why.push("kev");
    if (!why.length) continue;
    out.push({ cve: c.cve, title: c.title, kev: c.kev, epss: c.epss, why, exposure: hit && hit.count > 0 ? hit : null, actors });
  }
  const rank = (e: AzExploit) => (e.why.includes("az-actor") ? 4 : 0) + (e.why.includes("az-exposure") ? 2 : 0) + (e.kev ? 1 : 0);
  return out.sort((a, b) => rank(b) - rank(a) || (b.epss ?? 0) - (a.epss ?? 0)).slice(0, limit);
}

// ---- 5. the board ----------------------------------------------------------

/** ok=false: the source could not be read (rows is then empty, not "none"). */
export type Section<T> = { ok: boolean; rows: T };

export type AzBoard = {
  generatedAt: string;
  campaigns: Section<Campaign[]>;
  claims7d: number | null;
  adversaries: Section<Adversary[]>;
  adversariesWithheld: number;
  exposure: Section<ExposureListing[]>;
  exploits: Section<AzExploit[]>;
  exploitsDay: string | null;
  iocs: number | null;
};

export type AzCounts = {
  claims_7d: number | null;
  campaigns_7d: number | null;
  adversaries: number | null;
  exposure_listings: number | null;
  exploited_cves: number | null;
  linked_iocs: number | null;
};

// The "as of" line. A section that could not be read counts as null, never 0:
// "we don't know" and "there were none" print differently.
export function azCounts(b: AzBoard): AzCounts {
  const n = <T>(s: Section<T[]>) => (s.ok ? s.rows.length : null);
  return {
    claims_7d: b.campaigns.ok ? b.claims7d : null,
    campaigns_7d: n(b.campaigns),
    adversaries: n(b.adversaries),
    exposure_listings: n(b.exposure),
    exploited_cves: n(b.exploits),
    linked_iocs: b.iocs,
  };
}

// The JSON /api/v1/az serves: the same board the page prints, renamed to the
// API's snake_case and with nothing the page does not show.
export function apiBody(b: AzBoard): Record<string, unknown> {
  const sec = <T>(s: Section<T[]>) => (s.ok ? s.rows : null);
  return {
    generated_at: b.generatedAt,
    note:
      "Campaigns and exposure rows are CLAIMS made by third parties (hacktivist channels, trackers, leak sites), not confirmed incidents. Exposure is a listing only: no stolen data, no links to it. Every attribution carries its quote and source. null = that section could not be read; [] = nothing recorded.",
    counts: azCounts(b),
    campaigns_7d: sec(b.campaigns),
    adversaries: sec(b.adversaries),
    adversaries_withheld_uncited: b.adversariesWithheld,
    exposure: sec(b.exposure),
    exploited_now: b.exploits.ok ? { snapshot: b.exploitsDay, rows: b.exploits.rows } : null,
  };
}
