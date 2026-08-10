import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { getDb } from "@/lib/db";
import { getLatestSnapshot } from "@/lib/exposure";
import { toStory, type StoryDoc } from "@/lib/types";

// "Özünü yoxla" (Scan me) — the site half of ctiaze-engine's cti/scanme.py. A
// visitor types their own email or work domain; we answer straight:
//   • email  → breach exposure via XposedOrNot (free, keyless)
//   • domain → crt.sh subdomain surface + our own coverage naming it + an optional
//              AZ Shodan watchlist note.
// ONE hard rule, identical to the backend: NO FALSE POSITIVES. Every fact names
// its source; anything we can't positively confirm is `unavailable`, never guessed.
// PRIVACY: the raw email is used for exactly ONE outbound lookup, then dropped —
// never persisted, never logged, never echoed back.

export const revalidate = 0; // dynamic

const UA = "ctiaze.tech scan-me (+https://ctiaze.tech)";
const XON_URL = "https://api.xposedornot.com/v1/check-email/";
const CRTSH_URL = "https://crt.sh/";
const EMAIL_SOURCE = "XposedOrNot (api.xposedornot.com/v1/check-email)";
const CRTSH_SOURCE = "crt.sh certificate transparency";
const MENTIONS_SOURCE = "ctiaze items collection (title/summary/url, word-boundary match)";
const WATCHLIST_SOURCE = "Shodan AZ exposure snapshot (cti.exposure weekly sweep)";
const SUBDOMAIN_SAMPLE = 10;
const MENTIONS_LIMIT = 10;

// Deliberately conservative validators — the gate between untrusted input and any
// network call. A dot-bearing local part / two-label public host is required.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function fetchJson<T>(url: string, ms: number): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(ms),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------- email breach
function normalizeEmail(raw: string): string | null {
  const e = (raw || "").trim();
  if (!e || e.length > 254 || !EMAIL_RE.test(e)) return null;
  return e.toLowerCase();
}

// Map an XposedOrNot payload to breach names — confirmed names ONLY. "Not found"
// is a clean OK with no breaches; ANY other error or unrecognized shape is
// `unavailable` (fail closed). Mirrors scanme._parse_xon.
function parseXon(data: unknown): { status: "ok" | "unavailable"; breaches: string[] } {
  if (!data || typeof data !== "object") return { status: "unavailable", breaches: [] };
  const obj = data as Record<string, unknown>;
  if ("Error" in obj || "error" in obj) {
    const err = String(obj.Error ?? obj.error ?? "").toLowerCase();
    if (err.includes("not found")) return { status: "ok", breaches: [] };
    return { status: "unavailable", breaches: [] };
  }
  const raw = obj.breaches;
  if (raw == null) return { status: "unavailable", breaches: [] };
  const groups = Array.isArray(raw) ? raw : [raw];
  const names: string[] = [];
  for (const grp of groups) {
    const vals = Array.isArray(grp) ? grp : [grp];
    for (const v of vals) {
      const name = String(v).trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return { status: "ok", breaches: names };
}

async function scanEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { kind: "email", status: "invalid", breaches: [], count: 0, source: EMAIL_SOURCE, fetched_at: null };
  }
  // `normalized` is used ONLY on the next line — never stored, never logged.
  const data = await fetchJson<unknown>(XON_URL + encodeURIComponent(normalized), 8000);
  if (data == null) {
    return { kind: "email", status: "unavailable", breaches: [], count: 0, source: EMAIL_SOURCE, fetched_at: nowIso() };
  }
  const { status, breaches } = parseXon(data);
  return { kind: "email", status, breaches, count: breaches.length, source: EMAIL_SOURCE, fetched_at: nowIso() };
}

// ------------------------------------------------------------ domain attack surface
async function normalizeDomain(raw: string): Promise<string | null> {
  let d = (raw || "").trim().toLowerCase();
  if (!d) return null;
  d = d.replace(/^[a-z][a-z0-9+.\-]*:\/\//, ""); // scheme
  d = d.split(/[/?#]/, 1)[0]; // path/query/fragment
  d = d.split("@").pop() as string; // userinfo
  d = d.split(":")[0]; // port
  d = d.trim().replace(/\.+$/, ""); // trailing root dot
  if (!d) return null;
  try {
    // IDNA/punycode: a unicode host is encoded to the ASCII form the network
    // actually resolves, so validation can't be smuggled past.
    const { domainToASCII } = await import("node:url");
    const ascii = domainToASCII(d).toLowerCase();
    if (!ascii) return null;
    return DOMAIN_RE.test(ascii) ? ascii : null;
  } catch {
    return null;
  }
}

type CrtRow = { name_value?: string; common_name?: string };

async function scanSubdomains(domain: string) {
  const data = await fetchJson<CrtRow[]>(
    `${CRTSH_URL}?q=${encodeURIComponent("%." + domain)}&output=json`,
    12000
  );
  if (!Array.isArray(data)) {
    return { status: "unavailable", count: 0, sample: [], source: CRTSH_SOURCE, fetched_at: nowIso() };
  }
  const names = new Set<string>();
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const cands: string[] = [];
    if (typeof row.name_value === "string") cands.push(...row.name_value.split("\n"));
    if (typeof row.common_name === "string") cands.push(row.common_name);
    for (const cand of cands) {
      const name = cand.trim().toLowerCase().replace(/^\*\./, "");
      if (name && (name === domain || name.endsWith("." + domain))) names.add(name);
    }
  }
  const ordered = [...names].sort();
  return {
    status: "ok",
    count: ordered.length,
    sample: ordered.slice(0, SUBDOMAIN_SAMPLE),
    source: CRTSH_SOURCE,
    fetched_at: nowIso(),
  };
}

const PUBLISHED_FILTER = {
  published: true,
  retracted: { $ne: true },
  blocked_unsafe: { $ne: true },
  az_stub: { $ne: true },
} as const;

// Our own published stories that name the EXACT domain (word-boundary, so
// "example.com" never matches "sub.example.com" / "notexample.com" /
// "example.company"). Mongo regex is a broad case-insensitive prefilter; the
// exact-domain confirm runs in JS for identical semantics. Mirrors scanme._scan_mentions.
async function scanMentions(domain: string) {
  try {
    const db = await getDb();
    const col = db.collection<StoryDoc>("items");
    const pre = escapeRegex(domain);
    const docs = await col
      .find({
        ...PUBLISHED_FILTER,
        $or: [
          { title: { $regex: pre, $options: "i" } },
          { summary: { $regex: pre, $options: "i" } },
          { url: { $regex: pre, $options: "i" } },
        ],
      } as Record<string, unknown>)
      .limit(200)
      .toArray();
    const boundary = new RegExp(
      `(?<![\\w.\\-])${escapeRegex(domain)}(?![\\w\\-])(?!\\.[a-z0-9])`,
      "i"
    );
    const hits = docs.filter((d) => {
      const hay = ["title", "summary", "url"]
        .map((f) => String((d as Record<string, unknown>)[f] ?? ""))
        .join(" ");
      return boundary.test(hay);
    });
    hits.sort((a, b) => pubTime(b) - pubTime(a));
    const stories = hits.slice(0, MENTIONS_LIMIT).map((d) => {
      const s = toStory(d);
      return { title: s.titleAz || s.titleEn, url: `/xeber/${s.slug}`, source: d.source ?? "", published: s.publishedAt };
    });
    return { status: "ok", count: hits.length, stories, source: MENTIONS_SOURCE, fetched_at: nowIso() };
  } catch {
    return { status: "unavailable", count: 0, stories: [], source: MENTIONS_SOURCE, fetched_at: nowIso() };
  }
}
function pubTime(d: StoryDoc): number {
  const p = (d as Record<string, unknown>).source_published ?? d.published_at;
  const t = p ? new Date(p as string).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Curated product map — ports cti/footprint._PRODUCTS. (display, word-boundary
// regex, snapshot-watchlist-name substring). Only ever attaches a figure that the
// weekly snapshot actually measured.
const WATCHLIST_PRODUCTS: { display: string; re: RegExp; snap: string }[] = [
  { display: "FortiGate", re: /\bfortigate\b|\bfortios\b/i, snap: "fortigate" },
  { display: "Exchange", re: /\bmicrosoft exchange\b|\bexchange server\b|\bowa\b|\boutlook web\b/i, snap: "microsoft exchange" },
  { display: "MikroTik", re: /\bmikrotik\b/i, snap: "mikrotik" },
  { display: "ESXi", re: /\besxi\b/i, snap: "esxi" },
  { display: "GlobalProtect", re: /\bglobalprotect\b|\bpan-os\b/i, snap: "globalprotect" },
  { display: "NetScaler", re: /\bnetscaler\b|\bcitrix adc\b|\bcitrix gateway\b/i, snap: "netscaler" },
];
const AZ_MON = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
const SNAP_MAX_AGE_DAYS = 14;

async function scanWatchlist(domain: string) {
  // Only a domain string that unambiguously names one watchlist product qualifies —
  // zero or ambiguous matches stay silent (honesty over a guess).
  const matches = WATCHLIST_PRODUCTS.filter((p) => p.re.test(domain));
  if (matches.length !== 1) return null;
  const snap = await getLatestSnapshot().catch(() => null);
  if (!snap) return null;
  const swept = new Date(snap.swept_at).getTime();
  if (Number.isNaN(swept)) return null;
  if (Date.now() - swept > SNAP_MAX_AGE_DAYS * 86400_000) return null; // stale → quiet
  const wl = snap.watchlist ?? [];
  const entry = wl.find((w) => w.name.toLowerCase().includes(matches[0].snap));
  const count = entry?.count ?? 0;
  if (count <= 0) return null;
  const dt = new Date(swept);
  return {
    product: matches[0].display,
    az_exposed: count,
    as_of: `${String(dt.getUTCDate()).padStart(2, "0")} ${AZ_MON[dt.getUTCMonth()]}`,
    source: WATCHLIST_SOURCE,
    fetched_at: nowIso(),
  };
}

async function scanDomain(domain: string) {
  const normalized = await normalizeDomain(domain);
  if (!normalized) {
    return { kind: "domain", domain: null, status: "invalid", subdomains: null, mentions: null, watchlist: null };
  }
  const [subdomains, mentions, watchlist] = await Promise.all([
    scanSubdomains(normalized),
    scanMentions(normalized),
    scanWatchlist(normalized),
  ]);
  return { kind: "domain", domain: normalized, status: "ok", subdomains, mentions, watchlist };
}

export async function GET(req: Request) {
  // Tighter cap than the other tools: each scan can trigger an external breach/CT
  // lookup, so 12/min per IP is plenty for a human and blunts abuse.
  if (!rateLimit(`scan:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Çox sorğu göndərdiniz — bir dəqiqə gözləyin" }, { status: 429 });
  }
  const target = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!target) return NextResponse.json({ error: "E-poçt və ya domain yazın" }, { status: 400 });
  if (target.length > 254) return NextResponse.json({ error: "Giriş çox uzundur" }, { status: 400 });

  const isEmail = target.includes("@") && !target.includes("://");
  const result = isEmail ? await scanEmail(target) : await scanDomain(target);
  // The raw email is never echoed back — the caller already has it, and we hold none.
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
