import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { getDb } from "@/lib/db";
import { getLatestSnapshot } from "@/lib/exposure";
import { toStory, type StoryDoc } from "@/lib/types";

export const revalidate = 0;

const UA = "ctiaze.tech scan-me (+https://ctiaze.tech)";
const XON_ANALYTICS_URL = "https://api.xposedornot.com/v1/breach-analytics";
const XON_CHECK_URL = "https://api.xposedornot.com/v1/check-email/";
const CRTSH_URL = "https://crt.sh/";
const CERTSPOTTER_URL = "https://api.certspotter.com/v1/issuances";
const INTERNETDB_URL = "https://internetdb.shodan.io/";
const EMAIL_SOURCE = "XposedOrNot (breach-analytics)";
const CT_SOURCE = "certificate transparency (certspotter + crt.sh)";
const MENTIONS_SOURCE = "ctiaze items collection (title/summary/url, word-boundary match)";
const WATCHLIST_SOURCE = "Shodan AZ exposure snapshot (cti.exposure weekly sweep)";
const EXPOSURE_SOURCE = "Shodan InternetDB (keyless)";
const SUBDOMAIN_SAMPLE = 12;
const MENTIONS_LIMIT = 10;
const BREACH_LIMIT = 14;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function fetchJson<T>(url: string, ms: number): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function normalizeEmail(raw: string): string | null {
  const e = (raw || "").trim();
  if (!e || e.length > 254 || !EMAIL_RE.test(e)) return null;
  return e.toLowerCase();
}

type XonBreach = {
  breach?: string;
  domain?: string;
  industry?: string;
  xposed_data?: string;
  xposed_date?: string;
  verified?: string;
  password_risk?: string;
};
type XonAnalytics = {
  BreachMetrics?: { risk?: { risk_label?: string; risk_score?: number }[] } | null;
  ExposedBreaches?: { breaches_details?: XonBreach[] } | null;
};

function emailResult(status: string, extra: Record<string, unknown> = {}) {
  return {
    kind: "email",
    status,
    count: 0,
    riskLabel: null,
    riskScore: null,
    passwordsExposed: false,
    breaches: [],
    exposedData: [],
    source: EMAIL_SOURCE,
    fetched_at: status === "invalid" ? null : nowIso(),
    ...extra,
  };
}

function shapeBreaches(details: XonBreach[]) {
  const rows = details.map((b) => {
    const exposed = (b.xposed_data || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      name: (b.breach || "").trim(),
      domain: (b.domain || "").trim(),
      industry: (b.industry || "").trim(),
      year: (b.xposed_date || "").trim(),
      verified: (b.verified || "").toLowerCase() === "yes",
      passwordRisk: (b.password_risk || "").trim(),
      exposed,
      hasPassword: exposed.some((x) => /password/i.test(x)),
    };
  });
  // most actionable first: password leaks, then verified, then newest
  rows.sort(
    (a, b) =>
      Number(b.hasPassword) - Number(a.hasPassword) ||
      Number(b.verified) - Number(a.verified) ||
      (b.year || "").localeCompare(a.year || "")
  );
  return rows;
}

async function scanEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return emailResult("invalid");

  const data = await fetchJson<XonAnalytics>(
    `${XON_ANALYTICS_URL}?email=${encodeURIComponent(normalized)}`,
    9000
  );
  if (data === null) return scanEmailBasic(normalized); // analytics down → basic fallback

  const details = data.ExposedBreaches?.breaches_details;
  if (!Array.isArray(details) || details.length === 0) {
    return emailResult("ok"); // clean (200 with no breaches)
  }
  const rows = shapeBreaches(details);
  const exposedData = [...new Set(rows.flatMap((r) => r.exposed))].sort();
  const risk = data.BreachMetrics?.risk?.[0];
  return emailResult("ok", {
    count: rows.length,
    riskLabel: risk?.risk_label ?? null,
    riskScore: typeof risk?.risk_score === "number" ? risk.risk_score : null,
    passwordsExposed: rows.some((r) => r.hasPassword),
    breaches: rows.slice(0, BREACH_LIMIT),
    exposedData,
  });
}

// Fallback if the rich endpoint is unreachable: the simple check-email call, which
// cleanly separates a confirmed-clean ("Not found") from an error (fail closed).
async function scanEmailBasic(normalized: string) {
  const data = await fetchJson<Record<string, unknown>>(XON_CHECK_URL + encodeURIComponent(normalized), 8000);
  if (data === null) return emailResult("unavailable");
  if ("Error" in data || "error" in data) {
    const err = String(data.Error ?? data.error ?? "").toLowerCase();
    return err.includes("not found") ? emailResult("ok") : emailResult("unavailable");
  }
  const raw = data.breaches;
  if (raw == null) return emailResult("unavailable");
  const groups = Array.isArray(raw) ? raw : [raw];
  const names: string[] = [];
  for (const grp of groups) {
    for (const v of Array.isArray(grp) ? grp : [grp]) {
      const n = String(v).trim();
      if (n && !names.includes(n)) names.push(n);
    }
  }
  return emailResult("ok", {
    count: names.length,
    breaches: names.map((n) => ({ name: n, exposed: [], hasPassword: false, verified: false })),
  });
}

async function normalizeDomain(raw: string): Promise<string | null> {
  let d = (raw || "").trim().toLowerCase();
  if (!d) return null;
  d = d.replace(/^[a-z][a-z0-9+.\-]*:\/\//, "");
  d = d.split(/[/?#]/, 1)[0];
  d = d.split("@").pop() as string;
  d = d.split(":")[0];
  d = d.trim().replace(/\.+$/, "");
  if (!d) return null;
  try {
    const { domainToASCII } = await import("node:url");
    const ascii = domainToASCII(d).toLowerCase();
    return ascii && DOMAIN_RE.test(ascii) ? ascii : null;
  } catch {
    return null;
  }
}

function keepUnder(domain: string, raw: string, into: Set<string>) {
  const name = raw.trim().toLowerCase().replace(/^\*\./, "");
  if (name && (name === domain || name.endsWith("." + domain))) into.add(name);
}

type CsRow = { dns_names?: string[] };
async function certspotterNames(domain: string): Promise<Set<string> | null> {
  const data = await fetchJson<CsRow[]>(
    `${CERTSPOTTER_URL}?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`,
    9000
  );
  if (!Array.isArray(data)) return null;
  const names = new Set<string>();
  for (const row of data) for (const n of row?.dns_names ?? []) keepUnder(domain, n, names);
  return names;
}

type CrtRow = { name_value?: string; common_name?: string };
async function crtshNames(domain: string): Promise<Set<string> | null> {
  const data = await fetchJson<CrtRow[]>(`${CRTSH_URL}?q=${encodeURIComponent("%." + domain)}&output=json`, 7000);
  if (!Array.isArray(data)) return null;
  const names = new Set<string>();
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.name_value === "string") for (const n of row.name_value.split("\n")) keepUnder(domain, n, names);
    if (typeof row.common_name === "string") keepUnder(domain, row.common_name, names);
  }
  return names;
}

// unavailable only when BOTH CT sources fail — never a false "0".
async function scanSubdomains(domain: string) {
  const [cs, crt] = await Promise.all([certspotterNames(domain), crtshNames(domain)]);
  if (cs === null && crt === null) {
    return { status: "unavailable", count: 0, sample: [], source: CT_SOURCE, fetched_at: nowIso() };
  }
  const names = [...new Set<string>([...(cs ?? []), ...(crt ?? [])])].sort();
  return { status: "ok", count: names.length, sample: names.slice(0, SUBDOMAIN_SAMPLE), source: CT_SOURCE, fetched_at: nowIso() };
}

type IdbRow = { ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[] };
async function scanExposure(domain: string) {
  let ip: string | null = null;
  try {
    const dns = await import("node:dns");
    const addrs = await dns.promises.resolve4(domain);
    ip = addrs.find((a) => /^\d{1,3}(\.\d{1,3}){3}$/.test(a)) ?? null;
  } catch {
    ip = null;
  }
  const base = { ip, found: false, ports: [] as number[], vulns: [] as string[], tags: [] as string[], source: EXPOSURE_SOURCE, fetched_at: nowIso() };
  if (!ip) return { status: "unavailable", ...base };
  const idb = await fetchJson<IdbRow>(`${INTERNETDB_URL}${encodeURIComponent(ip)}`, 9000);
  if (idb == null) {
    const probe = await fetch(`${INTERNETDB_URL}${encodeURIComponent(ip)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6000),
    }).catch(() => null);
    if (probe && probe.status === 404) return { status: "ok", ...base }; // no scan record = honest clean
    return { status: "unavailable", ...base };
  }
  return {
    status: "ok",
    ip,
    found: true,
    ports: Array.isArray(idb.ports) ? [...idb.ports].sort((a, b) => a - b) : [],
    vulns: Array.isArray(idb.vulns) ? idb.vulns.map((v) => v.toUpperCase()) : [],
    tags: Array.isArray(idb.tags) ? idb.tags : [],
    source: EXPOSURE_SOURCE,
    fetched_at: nowIso(),
  };
}

const PUBLISHED_FILTER = {
  published: true,
  retracted: { $ne: true },
  blocked_unsafe: { $ne: true },
  az_stub: { $ne: true },
} as const;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Exact-domain, word-boundary match confirmed in JS (Mongo regex is a prefilter).
async function scanMentions(domain: string) {
  const fail = { status: "unavailable", count: 0, stories: [], source: MENTIONS_SOURCE, fetched_at: nowIso() };
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
    const boundary = new RegExp(`(?<![\\w.\\-])${escapeRegex(domain)}(?![\\w\\-])(?!\\.[a-z0-9])`, "i");
    const hits = docs.filter((d) =>
      boundary.test(["title", "summary", "url"].map((f) => String((d as Record<string, unknown>)[f] ?? "")).join(" "))
    );
    hits.sort((a, b) => pubTime(b) - pubTime(a));
    const stories = hits.slice(0, MENTIONS_LIMIT).map((d) => {
      const s = toStory(d);
      return { title: s.titleAz || s.titleEn, url: `/xeber/${s.slug}`, source: d.source ?? "", published: s.publishedAt };
    });
    return { status: "ok", count: hits.length, stories, source: MENTIONS_SOURCE, fetched_at: nowIso() };
  } catch {
    return fail;
  }
}
function pubTime(d: StoryDoc): number {
  const p = (d as Record<string, unknown>).source_published ?? d.published_at;
  const t = p ? new Date(p as string).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

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
  const matches = WATCHLIST_PRODUCTS.filter((p) => p.re.test(domain));
  if (matches.length !== 1) return null;
  const snap = await getLatestSnapshot().catch(() => null);
  if (!snap) return null;
  const swept = new Date(snap.swept_at).getTime();
  if (Number.isNaN(swept) || Date.now() - swept > SNAP_MAX_AGE_DAYS * 86400_000) return null;
  const entry = (snap.watchlist ?? []).find((w) => w.name.toLowerCase().includes(matches[0].snap));
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
    return { kind: "domain", domain: null, status: "invalid", subdomains: null, exposure: null, mentions: null, watchlist: null };
  }
  const [subdomains, exposure, mentions, watchlist] = await Promise.all([
    scanSubdomains(normalized),
    scanExposure(normalized),
    scanMentions(normalized),
    scanWatchlist(normalized),
  ]);
  return { kind: "domain", domain: normalized, status: "ok", subdomains, exposure, mentions, watchlist };
}

export async function GET(req: Request) {
  if (!rateLimit(`scan:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Çox sorğu göndərdiniz — bir dəqiqə gözləyin" }, { status: 429 });
  }
  const target = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!target) return NextResponse.json({ error: "E-poçt və ya domain yazın" }, { status: 400 });
  if (target.length > 254) return NextResponse.json({ error: "Giriş çox uzundur" }, { status: 400 });

  const isEmail = target.includes("@") && !target.includes("://");
  const result = isEmail ? await scanEmail(target) : await scanDomain(target);
  // the raw email is used only for the lookup above — never stored, logged, or echoed
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
