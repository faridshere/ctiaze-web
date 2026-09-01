import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { rateLimit, clientIp, withinSharedDailyBudget } from "@/lib/ratelimit";
import { verifyPow } from "@/lib/pow";
import { generateLookalikes, brandMatch, splitDomain } from "@/lib/lookalikes";
import { RDAP_TLDS } from "@/lib/domain-data";
import { getDb } from "@/lib/db";
import { getLatestSnapshot } from "@/lib/exposure";
import { toStory, type StoryDoc } from "@/lib/types";
import { classifyAddress } from "@/lib/addressclass";

// Explicit function budget: the exposure branch can chain a DNS resolve + a 9s
// InternetDB fetch + a 6s 404-probe, so cap the whole request well above that
// rather than inheriting the platform default (which could 504 mid-scan).
export const maxDuration = 30;

export const revalidate = 0;

const UA = "skopnix.com scan-me (+https://skopnix.com)";
const XON_ANALYTICS_URL = "https://api.xposedornot.com/v1/breach-analytics";
const XON_CHECK_URL = "https://api.xposedornot.com/v1/check-email/";
const LEAKCHECK_URL = "https://leakcheck.io/api/public";
const CRTSH_URL = "https://crt.sh/";
const CERTSPOTTER_URL = "https://api.certspotter.com/v1/issuances";
const INTERNETDB_URL = "https://internetdb.shodan.io/";
const EMAIL_SOURCE = "XposedOrNot (breach-analytics)";
const CT_SOURCE = "certificate transparency (certspotter + crt.sh)";
const MENTIONS_SOURCE = "skopnix items collection (title/summary/url, word-boundary match)";
const WATCHLIST_SOURCE = "Shodan AZ exposure snapshot (cti.exposure weekly sweep)";
const EXPOSURE_SOURCE = "Shodan InternetDB (keyless)";
const HR_EMAIL_URL = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email";
const HR_DOMAIN_URL = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-domain";
const HR_SOURCE = "Hudson Rock Cavalier (infostealer intel, free tier)";
const EMAIL_SEC_SOURCE = "DNS (MX · SPF · DMARC)";
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
type Breach = {
  name: string; domain?: string; industry?: string; year?: string;
  verified: boolean; passwordRisk?: string; exposed: string[]; hasPassword: boolean;
};
type XonAnalytics = {
  BreachMetrics?: {
    risk?: { risk_label?: string; risk_score?: number }[];
    // Same response, previously discarded. How the stolen passwords were STORED
    // is the sharpest number on the page: "PlainText" means a breached site kept
    // them readable, so that password is burned outright.
    passwords_strength?: Record<string, number>[];
    yearwise_details?: Record<string, number>[];
  } | null;
  ExposedBreaches?: { breaches_details?: XonBreach[] } | null;
  ExposedPastes?: { pastes_details?: unknown[] } | null;
  PastesSummary?: { cnt?: number } | null;
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
    pastesCount: 0,
    hibp: false,
    infostealer: null,
    addressClass: null,
    source: EMAIL_SOURCE,
    fetched_at: status === "invalid" ? null : nowIso(),
    ...extra,
  };
}

// ---- Hudson Rock Cavalier (free, keyless infostealer intelligence) -----------
// Infostealer infection = a machine fully compromised: EVERY saved credential,
// cookie and token exfiltrated. A far sharper signal than a data-breach, so we
// surface it prominently. We show only counts + dates for the queried target —
// never the leaked passwords/logins Hudson Rock returns.
type HrEmailStealer = { date_compromised?: string; total_corporate_services?: number; total_user_services?: number };
type HrEmail = { stealers?: HrEmailStealer[]; total_corporate_services?: number; total_user_services?: number };
type HrPwStats = { totalPass?: number; too_weak?: { perc?: number }; weak?: { perc?: number } };
type HrUrl = { url?: string; type?: string; occurrence?: number };
type HrDomain = {
  total?: number; employees?: number; users?: number; third_parties?: number;
  last_employee_compromised?: string; last_user_compromised?: string;
  stealerFamilies?: Record<string, number>;
  // Already present in the same (free) response — previously discarded. These are
  // the most concrete findings the scan can show a domain owner: the exact login
  // portals whose credentials were stolen, and how weak the stolen passwords were.
  data?: { employees_urls?: HrUrl[]; clients_urls?: HrUrl[] };
  employeePasswords?: HrPwStats;
  thirdPartyDomains?: { domain?: string; occurrence?: number }[];
  antiviruses?: { found?: number; not_found?: number };
};

function hrUrls(rows: HrUrl[] | undefined, limit: number) {
  return (rows ?? [])
    .filter((u) => typeof u.url === "string" && u.url)
    .sort((a, b) => (b.occurrence ?? 0) - (a.occurrence ?? 0))
    .slice(0, limit)
    .map((u) => ({ url: (u.url as string).slice(0, 160), hits: u.occurrence ?? 0 }));
}

// Hudson Rock returns the Unix epoch (1970-01-01) as its "no data" date sentinel.
function realDate(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) || t <= 0 ? null : iso;
}

async function hudsonRockEmail(email: string) {
  const fail = {
    status: "unavailable", infected: false, count: 0, lastCompromised: null as string | null,
    corporateServices: 0, userServices: 0, source: HR_SOURCE,
  };
  const d = await fetchJson<HrEmail>(`${HR_EMAIL_URL}?email=${encodeURIComponent(email)}`, 9000);
  // Only a well-shaped answer (a stealers array) is authoritative. A 200 body without
  // it — a notice/error payload or a schema change — must NOT fail open to "clean";
  // report unavailable instead (the no-false-claims rule cuts both ways).
  if (d === null || !Array.isArray(d.stealers)) return fail;
  const stealers = d.stealers;
  if (stealers.length === 0) return { ...fail, status: "ok" }; // answered → not infected
  const dates = stealers.map((s) => realDate(s.date_compromised)).filter(Boolean).sort() as string[];
  return {
    status: "ok",
    infected: true,
    count: stealers.length,
    lastCompromised: dates.length ? dates[dates.length - 1] : null,
    corporateServices: d.total_corporate_services ?? Math.max(0, ...stealers.map((s) => s.total_corporate_services ?? 0)),
    userServices: d.total_user_services ?? Math.max(0, ...stealers.map((s) => s.total_user_services ?? 0)),
    source: HR_SOURCE,
  };
}

async function hudsonRockDomain(domain: string) {
  const fail = {
    status: "unavailable", found: false, employees: 0, users: 0, thirdParties: 0, total: 0,
    lastEmployee: null as string | null, lastUser: null as string | null, families: [] as string[], source: HR_SOURCE,
  };
  const d = await fetchJson<HrDomain>(`${HR_DOMAIN_URL}?domain=${encodeURIComponent(domain)}`, 9000);
  // Require the expected numeric `total` before claiming a clean domain — a 200 body
  // missing it is an unknown state, not a "0 infections" result (see hudsonRockEmail).
  if (d === null || typeof d.total !== "number") return fail;
  const families =
    d.stealerFamilies && typeof d.stealerFamilies === "object"
      ? Object.entries(d.stealerFamilies)
          .filter(([k]) => k !== "total")
          .sort((a, b) => (b[1] || 0) - (a[1] || 0))
          .map(([k]) => k)
          .slice(0, 4)
      : [];
  const total = d.total;
  const pw = d.employeePasswords;
  const weakPct =
    pw && typeof pw.totalPass === "number" && pw.totalPass > 0
      ? Math.round((pw.too_weak?.perc ?? 0) + (pw.weak?.perc ?? 0))
      : null;
  return {
    status: "ok",
    found: total > 0,
    employees: d.employees ?? 0,
    users: d.users ?? 0,
    thirdParties: d.third_parties ?? 0,
    total,
    lastEmployee: realDate(d.last_employee_compromised),
    lastUser: realDate(d.last_user_compromised),
    families,
    // the concrete stuff (same response, no extra request)
    employeeUrls: hrUrls(d.data?.employees_urls, 6),
    userUrls: hrUrls(d.data?.clients_urls, 4),
    passwordCount: pw?.totalPass ?? 0,
    weakPasswordPct: weakPct,
    thirdPartyDomains: (d.thirdPartyDomains ?? [])
      .filter((t) => t.domain)
      .sort((a, b) => (b.occurrence ?? 0) - (a.occurrence ?? 0))
      .slice(0, 6)
      .map((t) => (t.domain as string).slice(0, 60)),
    noAvPct: d.antiviruses && typeof d.antiviruses.not_found === "number" ? d.antiviruses.not_found : null,
    source: HR_SOURCE,
  };
}

function shapeBreaches(details: XonBreach[]): Breach[] {
  const rows: Breach[] = details.map((b) => {
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

// Have I Been Pwned — the authoritative breach source. The email search needs a
// paid key, so it's OPTIONAL: when HIBP_API_KEY is set it unions in (and its rows
// win on dedup); without a key we fall back to the free sources below. (HIBP's
// free Pwned Passwords k-anonymity is used separately in /api/pwned.)
type HibpBreach = { Name?: string; Title?: string; Domain?: string; BreachDate?: string; DataClasses?: string[]; IsVerified?: boolean };
async function hibpRows(email: string): Promise<{ rows: Breach[]; available: boolean }> {
  const key = (process.env.HIBP_API_KEY || "").trim();
  if (!key) return { rows: [], available: false };
  // Best-effort per-instance daily ceiling on the paid HIBP calls. When exceeded,
  // skip HIBP and fall through to the free breach sources (scan still works) — the
  // per-IP limiter already ran at the route entry.
  if (!(await withinSharedDailyBudget("scan:hibp", 1500))) return { rows: [], available: false };
  try {
    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { "hibp-api-key": key, "user-agent": "skopnix.com" }, signal: AbortSignal.timeout(9000) }
    );
    if (r.status === 404) return { rows: [], available: true }; // authoritative clean
    if (!r.ok) return { rows: [], available: false }; // 401/403/429 → treat as unavailable
    const data = (await r.json()) as HibpBreach[];
    if (!Array.isArray(data)) return { rows: [], available: false };
    const rows: Breach[] = data.map((b) => {
      const exposed = Array.isArray(b.DataClasses) ? b.DataClasses : [];
      return {
        name: (b.Title || b.Name || "").trim(),
        domain: b.Domain,
        year: (b.BreachDate || "").slice(0, 4),
        verified: b.IsVerified !== false,
        exposed,
        hasPassword: exposed.some((x) => /password/i.test(x)),
      };
    });
    return { rows, available: true };
  } catch {
    return { rows: [], available: false };
  }
}

type LeakcheckResp = { success?: boolean; found?: number; fields?: string[]; sources?: { name?: string; date?: string }[] };

// Second breach source (free/keyless), unioned with XposedOrNot for wider coverage.
// Returns extra breach rows + the field types it saw + a RESULT-WIDE hasPassword.
// Fail-soft: empty on any error.
async function leakcheckRows(email: string): Promise<{ rows: Breach[]; fields: string[]; hasPassword: boolean }> {
  const d = await fetchJson<LeakcheckResp>(`${LEAKCHECK_URL}?check=${encodeURIComponent(email)}`, 8000);
  if (!d || d.success !== true || !Array.isArray(d.sources)) return { rows: [], fields: [], hasPassword: false };
  const fields = Array.isArray(d.fields) ? d.fields : [];
  const hasPw = fields.some((f) => /pass/i.test(f));
  const rows: Breach[] = d.sources
    .filter((s) => s?.name)
    .map((s) => ({
      name: String(s.name).trim(),
      year: (s.date || "").slice(0, 4),
      verified: false,
      exposed: [],
      // LeakCheck reports field types ONCE for the whole result, never per breach.
      // Stamping hasPassword per row would render a red "PASSWORD" chip on every
      // LeakCheck breach — a per-breach claim the source never made. Keep the flag
      // false here; the honest aggregate is returned separately and OR'd in below.
      hasPassword: false,
    }));
  // LeakCheck reports field types once for the whole result; map them to readable
  // exposed-data names so they join the aggregate chips.
  const FIELD_LABEL: Record<string, string> = {
    password: "Passwords", email: "Email addresses", username: "Usernames",
    phone: "Phone numbers", address: "Physical addresses", dob: "Dates of birth",
    ip: "IP addresses", name: "Names", first_name: "Names", last_name: "Names",
    ssn: "Government IDs", zip: "Physical addresses", city: "Geographic locations",
    country: "Geographic locations", gender: "Genders",
  };
  const mapped = [...new Set(fields.map((f) => FIELD_LABEL[f]).filter(Boolean))] as string[];
  return { rows, fields: mapped, hasPassword: hasPw };
}

async function scanEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return emailResult("invalid");

  // Whose exposure is this? A placeholder (test@example.com), a shared role mailbox
  // (info@) or a disposable address returns breaches that belong to everyone who
  // used it, not the person scanning — the UI uses this to reframe the result
  // honestly instead of headlining "YOUR passwords leaked".
  const addressClass = classifyAddress(normalized);

  const [data, lc, hibp, infostealer, gravatar] = await Promise.all([
    fetchJson<XonAnalytics>(`${XON_ANALYTICS_URL}?email=${encodeURIComponent(normalized)}`, 9000),
    leakcheckRows(normalized),
    hibpRows(normalized),
    hudsonRockEmail(normalized),
    gravatarProfile(normalized),
  ]);
  if (data === null && lc.rows.length === 0 && hibp.rows.length === 0 && !hibp.available) {
    return { ...(await scanEmailBasic(normalized)), infostealer, addressClass, gravatar };
  }

  const details = data?.ExposedBreaches?.breaches_details;
  const xonRows = Array.isArray(details) ? shapeBreaches(details) : [];

  // Union the sources by breach name (case-insensitive), best-detail-first:
  // HIBP (authoritative) → XposedOrNot (rich per-breach) → LeakCheck (breadth).
  const seen = new Set<string>();
  const merged: Breach[] = [];
  for (const r of [...hibp.rows, ...xonRows, ...lc.rows]) {
    const k = r.name.toLowerCase();
    if (k && !seen.has(k)) { seen.add(k); merged.push(r); }
  }
  if (merged.length === 0) return emailResult("ok", { infostealer, addressClass }); // no breaches (infostealer may still hit)

  merged.sort(
    (a, b) =>
      Number(b.hasPassword) - Number(a.hasPassword) ||
      Number(b.verified) - Number(a.verified) ||
      (b.year || "").localeCompare(a.year || "")
  );
  const exposedData = [...new Set([...merged.flatMap((r) => r.exposed), ...lc.fields])].sort();
  const risk = data?.BreachMetrics?.risk?.[0];
  const pastesCount = data?.PastesSummary?.cnt ?? data?.ExposedPastes?.pastes_details?.length ?? 0;
  const pws = data?.BreachMetrics?.passwords_strength?.[0];
  const passwordStorage = pws
    ? {
        plaintext: pws.PlainText ?? 0,
        easyToCrack: pws.EasyToCrack ?? 0,
        strongHash: pws.StrongHash ?? 0,
        unknown: pws.Unknown ?? 0,
      }
    : null;
  // Year -> count, oldest first, trimmed to years that actually had a breach.
  const yw = data?.BreachMetrics?.yearwise_details?.[0];
  const timeline = yw
    ? Object.entries(yw)
        .map(([k, v]) => ({ year: Number(String(k).replace(/^y/, "")), count: Number(v) || 0 }))
        .filter((r) => Number.isFinite(r.year) && r.year > 1990)
        .sort((a, b) => a.year - b.year)
    : [];
  const firstSeen = timeline.find((r) => r.count > 0)?.year ?? null;
  const worstYear = timeline.reduce<{ year: number; count: number } | null>(
    (best, r) => (r.count > 0 && (!best || r.count > best.count) ? r : best),
    null
  );
  return emailResult("ok", {
    count: merged.length,
    passwordStorage,
    timeline,
    firstSeen,
    worstYear,
    riskLabel: risk?.risk_label ?? null,
    riskScore: typeof risk?.risk_score === "number" ? risk.risk_score : null,
    // Aggregate signal: any row that individually leaked a password OR LeakCheck's
    // result-wide password flag. Honest at the summary level without fabricating a
    // per-breach claim (LeakCheck rows carry hasPassword:false — see leakcheckRows).
    passwordsExposed: merged.some((r) => r.hasPassword) || lc.hasPassword,
    breaches: merged.slice(0, BREACH_LIMIT),
    exposedData,
    pastesCount,
    hibp: hibp.available,
    infostealer,
    addressClass,
    gravatar,
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
// "not_supported" ≠ null: certspotter permanently refuses to enumerate a public
// registry (a Public-Suffix-List domain like gov.az), which is an honest "can't",
// not a transient outage. null is a real/transient failure.
async function certspotterNames(domain: string): Promise<Set<string> | "not_supported" | null> {
  try {
    const r = await fetch(
      `${CERTSPOTTER_URL}?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) }
    );
    if (r.status === 403) {
      const body = await r.text().catch(() => "");
      if (/not_allowed_by_plan|not beneath an eTLD/i.test(body)) return "not_supported";
      return null;
    }
    if (!r.ok) return null;
    const data = (await r.json()) as CsRow[];
    if (!Array.isArray(data)) return null;
    const names = new Set<string>();
    for (const row of data) for (const n of row?.dns_names ?? []) keepUnder(domain, n, names);
    return names;
  } catch {
    return null;
  }
}

type CrtRow = { name_value?: string; common_name?: string };
async function crtshNames(domain: string): Promise<Set<string> | null> {
  // crt.sh is comprehensive but flaky — frequent 502s/timeouts on larger zones. One
  // retry rescues the momentary 502s (they return fast). Budgets are deliberately
  // tight: when BOTH CT sources fail we now fall through to passive DNS, so a long
  // retry here just eats the function budget before that fallback gets its turn.
  for (let attempt = 0; attempt < 2; attempt++) {
    const data = await fetchJson<CrtRow[]>(
      `${CRTSH_URL}?q=${encodeURIComponent("%." + domain)}&output=json`,
      attempt === 0 ? 8000 : 3000
    );
    if (!Array.isArray(data)) continue;
    const names = new Set<string>();
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      if (typeof row.name_value === "string") for (const n of row.name_value.split("\n")) keepUnder(domain, n, names);
      if (typeof row.common_name === "string") keepUnder(domain, row.common_name, names);
    }
    return names;
  }
  return null;
}

// "ok" (real data), "not_supported" (public-registry domain that can't be enumerated),
// or "unavailable" (both sources transiently failed) — never a false "0".
// Fallback subdomain source, used ONLY when both CT sources fail. certspotter
// rate-limits (HTTP 429) and crt.sh has long 502 outages — when they go down
// together the flagship card goes blank, so this passive-DNS source (keyless,
// anonymous tier) rescues it. Not used on the happy path: CT is more complete.
const PDNS_URL = "https://api.mnemonic.no/pdns/v3/";

type PdnsRow = { query?: string; rrtype?: string };

async function passiveDnsNames(domain: string): Promise<Set<string> | null> {
  const j = await fetchJson<{ responseCode?: number; data?: PdnsRow[] }>(
    `${PDNS_URL}${encodeURIComponent(domain)}?limit=200`,
    5000
  );
  if (!j || !Array.isArray(j.data)) return null;
  const suffix = `.${domain.toLowerCase()}`;
  const names = new Set<string>();
  for (const row of j.data) {
    const q = (row.query || "").toLowerCase().replace(/\.$/, "");
    if (q && q.endsWith(suffix) && !q.includes("*")) names.add(q);
  }
  return names;
}

async function scanSubdomains(domain: string) {
  const [cs, crt] = await Promise.all([certspotterNames(domain), crtshNames(domain)]);
  const csNames = cs instanceof Set ? cs : null;
  let fallback: Set<string> | null = null;
  if (csNames === null && crt === null && cs !== "not_supported") {
    // Both CT sources are down (429 / 502). Try passive DNS before giving up.
    fallback = await passiveDnsNames(domain);
  }
  if (csNames === null && crt === null && (fallback === null || fallback.size === 0)) {
    // Distinguish "can't enumerate this kind of domain" from "sources are down" so
    // the UI doesn't imply a retry would help a gov.az-class public-suffix domain.
    const status = cs === "not_supported" ? "not_supported" : "unavailable";
    return { status, count: 0, sample: [], source: CT_SOURCE, fetched_at: nowIso() };
  }
  const names = [...new Set<string>([...(csNames ?? []), ...(crt ?? []), ...(fallback ?? [])])].sort();
  const hygiene = await subdomainHygiene(names);
  return { status: "ok", count: names.length, sample: names.slice(0, SUBDOMAIN_SAMPLE), hygiene, source: CT_SOURCE, fetched_at: nowIso() };
}

// ---- Subdomain hygiene: dangling takeovers + leaked internal hosts ---------
// Built on the CT names we already fetched — no new third-party call. Two of the
// sharpest findings a domain owner can get:
//   * a subdomain whose CNAME still points at a de-provisioned SaaS bucket, which
//     anyone can re-register and then serve content from YOUR hostname;
//   * an internal hostname published to the world in a certificate, resolving to
//     a private RFC1918 address — free recon for an attacker.
// Honesty rule: a takeover is only reported when the A lookup is AUTHORITATIVELY
// absent (ENOTFOUND/ENODATA). A timeout or SERVFAIL is "unknown" and is never
// reported as a finding.
const TAKEOVER_TARGETS: { re: RegExp; service: string }[] = [
  { re: /\.s3[.-][\w-]*amazonaws\.com$/i, service: "Amazon S3" },
  { re: /\.cloudfront\.net$/i, service: "CloudFront" },
  { re: /\.elasticbeanstalk\.com$/i, service: "Elastic Beanstalk" },
  { re: /\.github\.io$/i, service: "GitHub Pages" },
  { re: /\.herokuapp\.com$|\.herokudns\.com$/i, service: "Heroku" },
  { re: /\.azurewebsites\.net$|\.cloudapp\.(net|azure\.com)$|\.trafficmanager\.net$|\.blob\.core\.windows\.net$/i, service: "Microsoft Azure" },
  { re: /\.pages\.dev$/i, service: "Cloudflare Pages" },
  { re: /\.netlify\.(app|com)$/i, service: "Netlify" },
  { re: /\.vercel\.app$|\.vercel-dns\.com$/i, service: "Vercel" },
  { re: /\.surge\.sh$/i, service: "Surge" },
  { re: /\.wpengine\.com$/i, service: "WP Engine" },
  { re: /\.zendesk\.com$/i, service: "Zendesk" },
  { re: /\.readthedocs\.io$/i, service: "Read the Docs" },
  { re: /\.ghost\.io$/i, service: "Ghost" },
  { re: /\.myshopify\.com$/i, service: "Shopify" },
  { re: /\.statuspage\.io$/i, service: "Statuspage" },
  { re: /\.pantheonsite\.io$/i, service: "Pantheon" },
  { re: /\.bitbucket\.io$/i, service: "Bitbucket" },
  { re: /\.fastly\.net$/i, service: "Fastly" },
  { re: /\.unbouncepages\.com$/i, service: "Unbounce" },
];

function privateIpClass(ip: string): string | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  if (a === 10) return "10.0.0.0/8";
  if (a === 192 && b === 168) return "192.168.0.0/16";
  if (a === 172 && b >= 16 && b <= 31) return "172.16.0.0/12";
  if (a === 127) return "loopback";
  if (a === 169 && b === 254) return "link-local";
  if (a === 100 && b >= 64 && b <= 127) return "carrier-grade NAT";
  return null;
}

async function subdomainHygiene(names: string[]) {
  const targets = names.filter((n) => !n.includes("*")).slice(0, 24);
  const dangling: { name: string; service: string; cname: string }[] = [];
  const internal: { name: string; ip: string; range: string }[] = [];
  if (targets.length === 0) return { checked: 0, dangling, internal };
  const dns = await import("node:dns");
  const CONC = 24; // one wave: keeps this bounded at ~2s no matter how many names
  for (let i = 0; i < targets.length; i += CONC) {
    await Promise.all(
      targets.slice(i, i + CONC).map(async (name) => {
        const [cn, a] = await Promise.all([
          dnsResolve(dns.promises.resolveCname(name), 2000),
          dnsResolve(dns.promises.resolve4(name), 2000),
        ]);
        if (a.status === "ok") {
          for (const ip of a.value) {
            const range = privateIpClass(ip);
            if (range) { internal.push({ name, ip, range }); break; }
          }
          return;
        }
        if (a.status === "absent" && cn.status === "ok") {
          const target = cn.value[0] ?? "";
          const hit = TAKEOVER_TARGETS.find((t) => t.re.test(target));
          if (hit) dangling.push({ name, service: hit.service, cname: target });
        }
      })
    );
  }
  return { checked: targets.length, dangling: dangling.slice(0, 6), internal: internal.slice(0, 6) };
}

type IdbRow = { ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[] };
async function scanExposure(domain: string) {
  let ip: string | null = null;
  const dns = await import("node:dns");
  // Bound the resolve like every other lookup — c-ares' default (~5s × retries ×
  // servers) can hang this branch for 15-20s against a black-holing resolver, and
  // scanDomain awaits Promise.all, so one slow branch stalls the whole request.
  const addrs = await dnsRace(dns.promises.resolve4(domain), 4000);
  ip = (addrs ?? []).find((a) => /^\d{1,3}(\.\d{1,3}){3}$/.test(a)) ?? null;
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
      return { title: s.titleAz || s.titleEn, url: `/news/${s.slug}`, source: d.source ?? "", published: s.publishedAt };
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

// ---- Email-security posture (MX / SPF / DMARC) -------------------------------
// A domain with no DMARC (or a p=none policy) is trivially spoofable — the exact
// setup phishing crews abuse to impersonate a company. All keyless DNS lookups.
async function dnsRace<T>(p: Promise<T>, ms = 6000): Promise<T | null> {
  try {
    return (await Promise.race([
      p,
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ])) as T;
  } catch {
    return null;
  }
}

function spfAll(txt: string): string | null {
  const m = txt.match(/[~\-?+]all\b/);
  return m ? m[0] : null;
}
function dmarcPolicy(txt: string): string | null {
  const m = txt.match(/\bp\s*=\s*(none|quarantine|reject)\b/i);
  return m ? m[1].toLowerCase() : null;
}

// A DNS lookup outcome that keeps absence and failure distinct — the difference
// between "this domain verifiably has no DMARC" and "we couldn't check". Only the
// former may be shown to a user as a security weakness (the honesty rule).
type RecStatus = "ok" | "absent" | "unknown";
type DnsOutcome<T> = { status: "ok"; value: T } | { status: "absent" } | { status: "unknown" };

async function dnsResolve<T>(p: Promise<T>, ms = 6000): Promise<DnsOutcome<T>> {
  try {
    const value = (await Promise.race([
      p,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ])) as T;
    return { status: "ok", value };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    // ENOTFOUND (no such name) / ENODATA (name exists, no record of this type) are
    // authoritative absence. SERVFAIL, refused, and our own timeout (no .code) are
    // unknown — never reported to the user as "the record is missing".
    if (code === "ENOTFOUND" || code === "ENODATA") return { status: "absent" };
    return { status: "unknown" };
  }
}

// Spoofability grade (A–F) derived purely from the SPF/DMARC state we positively
// know. Turns the raw records into one actionable letter for an IT admin, and
// surfaces the two silent weaknesses: SPF with no ~all/-all qualifier, and DMARC
// p=none. Returns null when either record is unknown — never guess a grade.
function spoofGrade(
  spf: { policy: string | null; status: RecStatus },
  dmarc: { policy: string | null; status: RecStatus },
): { grade: "A" | "B" | "C" | "D" | "F"; spoofable: boolean } | null {
  if (spf.status === "unknown" || dmarc.status === "unknown") return null;
  const dp = dmarc.status === "ok" ? dmarc.policy : null; // reject | quarantine | none | null(absent)
  const spfEnforced = spf.status === "ok" && (spf.policy === "-all" || spf.policy === "~all");
  let grade: "A" | "B" | "C" | "D" | "F";
  if (dp === "reject") grade = spfEnforced ? "A" : "B";
  else if (dp === "quarantine") grade = "C";
  else grade = spfEnforced ? "D" : "F"; // no DMARC enforcement (none/absent)
  // Without a quarantine/reject DMARC policy, from-header spoofing is trivial.
  const spoofable = dp !== "reject" && dp !== "quarantine";
  return { grade, spoofable };
}

async function scanEmailSecurity(domain: string) {
  const dns = await import("node:dns");
  const [mxO, txtO, dmarcO] = await Promise.all([
    dnsResolve(dns.promises.resolveMx(domain)),
    dnsResolve(dns.promises.resolveTxt(domain)),
    dnsResolve(dns.promises.resolveTxt(`_dmarc.${domain}`)),
  ]);
  const flat = (recs: string[][]) => recs.map((r) => r.join(""));

  // MX
  const mxPresent = mxO.status === "ok" && Array.isArray(mxO.value) && mxO.value.length > 0;
  const mxStatus: RecStatus = mxO.status === "unknown" ? "unknown" : mxPresent ? "ok" : "absent";

  // SPF lives in the apex TXT: a resolved TXT set lets us confirm present OR absent;
  // an unknown TXT lookup makes SPF status unknown (must not claim "missing").
  let spfRec: string | undefined;
  let spfStatus: RecStatus;
  if (txtO.status === "ok") {
    spfRec = flat(txtO.value).find((t) => /^v=spf1\b/i.test(t.trim()));
    spfStatus = spfRec ? "ok" : "absent";
  } else {
    spfStatus = txtO.status === "absent" ? "absent" : "unknown";
  }

  // DMARC at _dmarc.<domain>.
  let dmarcRec: string | undefined;
  let dmarcStatus: RecStatus;
  if (dmarcO.status === "ok") {
    dmarcRec = flat(dmarcO.value).find((t) => /^v=DMARC1\b/i.test(t.trim()));
    dmarcStatus = dmarcRec ? "ok" : "absent";
  } else {
    dmarcStatus = dmarcO.status === "absent" ? "absent" : "unknown";
  }

  const spf = { present: !!spfRec, policy: spfRec ? spfAll(spfRec) : null, status: spfStatus };
  const dmarc = { present: !!dmarcRec, policy: dmarcRec ? dmarcPolicy(dmarcRec) : null, status: dmarcStatus };

  // Whole card is unavailable only when every lookup failed unknown.
  const allUnknown = mxStatus === "unknown" && spfStatus === "unknown" && dmarcStatus === "unknown";
  return {
    status: allUnknown ? "unavailable" : "ok",
    mx: { present: mxPresent, status: mxStatus },
    spf,
    dmarc,
    grade: spoofGrade(spf, dmarc),
    source: EMAIL_SEC_SOURCE,
    fetched_at: nowIso(),
  };
}

// ---- Lookalike / typosquat domains (dnstwist port, keyless) -----------------
// Generate the typosquats an attacker would register to phish this domain, then
// DNS-resolve them — the ones that RESOLVE are already registered, and a resolved
// lookalike WITH an MX record is active phishing prep, not a parked coincidence.
async function scanLookalikes(domain: string) {
  const variants = generateLookalikes(domain, 140).filter((v) => /^[a-z0-9.-]+$/.test(v));
  const top = variants.slice(0, 48);
  const dns = await import("node:dns");
  const registered: { domain: string; ip: string; hasMx: boolean }[] = [];
  const CONC = 16;
  for (let i = 0; i < top.length; i += CONC) {
    const batch = top.slice(i, i + CONC);
    const rows = await Promise.all(batch.map(async (v) => {
      const addrs = await dnsRace(dns.promises.resolve4(v), 2500);
      const ip = (addrs ?? []).find((a) => /^\d{1,3}(\.\d{1,3}){3}$/.test(a)) ?? null;
      if (!ip) return null;
      const mx = await dnsRace(dns.promises.resolveMx(v), 2500);
      return { domain: v, ip, hasMx: Array.isArray(mx) && mx.length > 0 };
    }));
    for (const r of rows) if (r) registered.push(r);
  }
  registered.sort((a, b) => Number(b.hasMx) - Number(a.hasMx));
  return { status: "ok" as const, checked: top.length, registered: registered.slice(0, 12) };
}

// ---- Gravatar public profile (keyless) --------------------------------------
// The sharpest "wait, that's public about ME?" on the page: an email address
// hashes to a public profile anyone can fetch without consent or a login. Only
// rendered on a hit — "no Gravatar" is not a finding. We deliberately do NOT
// embed avatar_url: a remote image would beacon every scan to a third party and
// break the CSP. We describe it and link the public profile instead.
const GRAVATAR_URL = "https://api.gravatar.com/v3/profiles/";

async function gravatarProfile(email: string) {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const r = await fetch(`${GRAVATAR_URL}${hash}`, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);
  if (!r) return { status: "unavailable" as const };
  if (r.status === 404) return { status: "none" as const };
  if (!r.ok) return { status: "unavailable" as const };
  const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  if (!j) return { status: "unavailable" as const };
  const str = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 60) : null);
  return {
    status: "ok" as const,
    displayName: str(j.display_name),
    location: str(j.location),
    jobTitle: str(j.job_title),
    company: str(j.company),
    profileUrl: str(j.profile_url),
    verifiedAccounts: Array.isArray(j.verified_accounts) ? j.verified_accounts.length : 0,
  };
}

// ---- Public recon feed (urlscan.io, keyless) --------------------------------
// Scans OTHER people already ran against this domain — permanent public records
// of someone probing it. Zero touch on the target. Paths are sanitized to
// host+pathname and must belong to the scanned domain.
const URLSCAN_URL = "https://urlscan.io/api/v1/search/";

async function urlscanRecon(domain: string) {
  const base = { status: "unavailable" as "ok" | "unavailable", total: 0, recent: [] as { path: string; date: string }[] };
  if (!(await withinSharedDailyBudget("scan:urlscan", 1500))) return base;
  const j = await fetchJson<{ total?: number; results?: { task?: { time?: string }; page?: { url?: string } }[] }>(
    `${URLSCAN_URL}?q=${encodeURIComponent(`page.domain:"${domain}"`)}&size=12`,
    5000
  );
  if (!j || typeof j.total !== "number") return base;
  const suffix = domain.toLowerCase();
  const recent: { path: string; date: string }[] = [];
  for (const row of j.results ?? []) {
    const raw = row.page?.url;
    if (typeof raw !== "string") continue;
    let host = "", pathname = "";
    try {
      const u = new URL(raw);
      host = u.hostname.toLowerCase();
      pathname = u.pathname;
    } catch {
      continue;
    }
    if (host !== suffix && !host.endsWith(`.${suffix}`)) continue; // never echo a foreign host
    recent.push({ path: `${host}${pathname === "/" ? "" : pathname}`.slice(0, 90), date: (row.task?.time ?? "").slice(0, 10) });
    if (recent.length >= 4) break;
  }
  return { status: "ok" as const, total: j.total, recent };
}

// ---- RDAP domain registration (rdap.org, keyless) ---------------------------
// Domain age is a strong phishing signal — a brand-new domain impersonating a
// company is the classic setup. Also surfaces DNSSEC + registrar in one call.
const RDAP_DOMAIN = "https://rdap.org/domain/";

async function scanRegistration(domain: string) {
  const base = {
    status: "unavailable" as "ok" | "unavailable" | "no_rdap",
    created: null as string | null, ageDays: null as number | null,
    nrd: false, dnssec: null as boolean | null, registrar: null as string | null,
  };
  // Be honest instead of shrugging: ~half the world's ccTLDs (.az .tr .ge .ru
  // .kz .io …) publish no RDAP at all, so "unavailable" would read as a failure
  // on our side rather than a fact about the registry.
  const tld = (splitDomain(domain)?.tld ?? "").split(".").pop() ?? "";
  if (tld && !RDAP_TLDS.has(tld)) return { ...base, status: "no_rdap" as const };
  const j = await fetchJson<Record<string, unknown>>(`${RDAP_DOMAIN}${encodeURIComponent(domain)}`, 9000).catch(() => null);
  if (!j) return base;
  const events = (j.events as { eventAction?: string; eventDate?: string }[]) || [];
  const created = events.find((e) => e.eventAction === "registration")?.eventDate ?? null;
  const ageDays = created ? Math.floor((Date.now() - new Date(created).getTime()) / 86_400_000) : null;
  const secureDNS = j.secureDNS as { delegationSigned?: boolean } | undefined;
  let registrar: string | null = null;
  const rar = ((j.entities as { roles?: string[]; vcardArray?: unknown[] }[]) || []).find((e) => (e.roles || []).includes("registrar"));
  const vcard = rar?.vcardArray?.[1] as unknown[] | undefined;
  const fn = Array.isArray(vcard) ? (vcard as unknown[][]).find((f) => f[0] === "fn") : undefined;
  if (fn && typeof fn[3] === "string") registrar = fn[3].slice(0, 60);
  return {
    status: "ok" as const, created, ageDays,
    nrd: ageDays != null && ageDays >= 0 && ageDays < 30,
    dnssec: secureDNS?.delegationSigned ?? null, registrar,
  };
}

// ---- Hosting + IP reputation (ip-api.com + GreyNoise community, keyless) -----
const IPAPI_URL = "http://ip-api.com/json/";
const GREYNOISE_URL = "https://api.greynoise.io/v3/community/";

function isPublicIpv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 169 && b === 254) return false;
  return true;
}

async function scanIpIntel(domain: string) {
  const base = {
    status: "unavailable" as "ok" | "unavailable",
    ip: null as string | null, asn: null as string | null, org: null as string | null,
    country: null as string | null, hosting: false, proxy: false,
    greynoise: null as { noise: boolean; riot: boolean; classification: string | null; name: string | null; message: string | null } | null,
  };
  const dns = await import("node:dns");
  const addrs = await dnsRace(dns.promises.resolve4(domain), 4000);
  const ip = (addrs ?? []).find((x) => /^\d{1,3}(\.\d{1,3}){3}$/.test(x)) ?? null;
  if (!ip || !isPublicIpv4(ip)) return base;
  const [geo, gn] = await Promise.all([
    fetchJson<Record<string, unknown>>(`${IPAPI_URL}${ip}?fields=status,country,city,isp,org,as,asname,hosting,proxy,mobile,query`, 6000).catch(() => null),
    fetchJson<Record<string, unknown>>(`${GREYNOISE_URL}${ip}`, 6000).catch(() => null),
  ]);
  const asRaw = typeof geo?.as === "string" ? geo.as : "";
  return {
    status: "ok" as const, ip,
    asn: asRaw ? asRaw.split(" ")[0] : null,
    org: (geo?.org as string) || (geo?.isp as string) || null,
    country: (geo?.country as string) || null,
    hosting: Boolean(geo?.hosting), proxy: Boolean(geo?.proxy),
    greynoise: gn ? {
      noise: Boolean(gn.noise), riot: Boolean(gn.riot),
      classification: (gn.classification as string) || null,
      name: (gn.name as string) || null, message: (gn.message as string) || null,
    } : null,
  };
}

async function scanDomain(domain: string) {
  const normalized = await normalizeDomain(domain);
  if (!normalized) {
    return {
      kind: "domain", domain: null, status: "invalid",
      subdomains: null, exposure: null, mentions: null, watchlist: null,
      emailSecurity: null, infostealer: null, registration: null, ipIntel: null,
      lookalikes: null, brandImpersonation: null, recon: null,
    };
  }
  const brandImpersonation = brandMatch(normalized);
  const [subdomains, exposure, mentions, watchlist, emailSecurity, infostealer, registration, ipIntel, lookalikes, recon] = await Promise.all([
    scanSubdomains(normalized),
    scanExposure(normalized),
    scanMentions(normalized),
    scanWatchlist(normalized),
    scanEmailSecurity(normalized),
    hudsonRockDomain(normalized),
    scanRegistration(normalized),
    scanIpIntel(normalized),
    scanLookalikes(normalized),
    urlscanRecon(normalized),
  ]);
  return {
    kind: "domain", domain: normalized, status: "ok",
    subdomains, exposure, mentions, watchlist, emailSecurity, infostealer, registration, ipIntel,
    lookalikes, brandImpersonation, recon,
  };
}

export async function GET(req: Request) {
  if (!rateLimit(`scan:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many requests — wait a minute" }, { status: 429 });
  }
  if (!verifyPow(req.headers.get("x-pow"))) {
    return NextResponse.json({ error: "Couldn't verify the request — refresh the page and try again." }, { status: 403 });
  }
  const target = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!target) return NextResponse.json({ error: "Enter an email or domain" }, { status: 400 });
  if (target.length > 254) return NextResponse.json({ error: "Input is too long" }, { status: 400 });

  const isEmail = target.includes("@") && !target.includes("://");
  const result = isEmail ? await scanEmail(target) : await scanDomain(target);
  // the raw email is used only for the lookup above — never stored, logged, or echoed
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
