// stacknix — the paid stack-exposure engine. Submit a technology stack
// (product + version) and get its real vulnerability exposure: matching CVEs,
// CISA-KEV (exploited-in-wild) status, FIRST EPSS, CVSS, and — the part free
// NVD search gets wrong — whether the SUBMITTED VERSION is actually in the
// vulnerable range.
//
// Hard-won truth (verified on the Cortex work, Aug 2026): NVD's
// `virtualMatchString` does NOT filter by version — Chrome 120 returns 2721
// CVEs, Chrome 141 returns 2335, same product, both "all versions". So we pull
// every CVE for the product's CPE and evaluate versionStartIncluding /
// versionEndExcluding LOCALLY. Anything that trusts the API's version filter
// ships garbage. Acid-tested: log4j 2.14.1 → CVE-2021-44228 IN RANGE, 2.17.1
// NOT IN RANGE.
import { unstable_cache } from "next/cache";
import { kevMeta, kevCatalogDate, epssDetailed, type KevRow } from "./cveintel";

const NVD = "https://services.nvd.nist.gov/rest/json";
const UA = "skopnix stacknix (+https://ctiaze.tech)";
const KEY = process.env.NVD_API_KEY; // optional; keyless 5/30s, keyed 50/30s

async function nvd<T>(url: string, ms = 12000): Promise<T | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(ms),
      headers: { accept: "application/json", "User-Agent": UA, ...(KEY ? { apiKey: KEY } : {}) },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// ---- input parsing -------------------------------------------------------
export type StackLine = { raw: string; product: string; version: string | null };

// Split a free-text line into product + version. The version is a trailing
// digit-led token (2.4.49, 8.2p1, 7.0.5, 2019). "log4j 2.14.1" → { log4j, 2.14.1 }.
export function parseStackLine(raw: string): StackLine | null {
  const line = raw.trim().replace(/\s+/g, " ");
  if (!line) return null;
  if (line.length > 120) return { raw: line.slice(0, 120), product: line.slice(0, 120), version: null };
  const m = line.match(/^(.*?)[\s@:v]*\b(\d[\w.\-]*)\s*$/i);
  if (m && m[1].trim()) return { raw: line, product: m[1].trim().replace(/[\s,@:]+$/, ""), version: m[2] };
  return { raw: line, product: line, version: null };
}

export function parseStack(text: string, cap = 15): StackLine[] {
  const seen = new Set<string>();
  const out: StackLine[] = [];
  for (const l of text.split(/[\n;]+/)) {
    const p = parseStackLine(l);
    if (!p) continue;
    const key = `${p.product.toLowerCase()}|${p.version ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= cap) break;
  }
  return out;
}

// ---- CPE resolution (product name → vendor:product) ----------------------
export type Cpe = { vendor: string; product: string; title: string; part: string };

// Curated high-confidence product → CPE base. Bypasses the noisy keyword search
// for the security products people actually run; fuzzy resolver handles the rest.
const ALIAS: Record<string, Cpe> = {
  log4j: { vendor: "apache", product: "log4j", title: "Apache Log4j", part: "a" },
  log4j2: { vendor: "apache", product: "log4j", title: "Apache Log4j", part: "a" },
  openssh: { vendor: "openbsd", product: "openssh", title: "OpenBSD OpenSSH", part: "a" },
  apache: { vendor: "apache", product: "http_server", title: "Apache HTTP Server", part: "a" },
  httpd: { vendor: "apache", product: "http_server", title: "Apache HTTP Server", part: "a" },
  tomcat: { vendor: "apache", product: "tomcat", title: "Apache Tomcat", part: "a" },
  struts: { vendor: "apache", product: "struts", title: "Apache Struts", part: "a" },
  nginx: { vendor: "nginx", product: "nginx", title: "nginx", part: "a" },
  exchange: { vendor: "microsoft", product: "exchange_server", title: "Microsoft Exchange Server", part: "a" },
  sharepoint: { vendor: "microsoft", product: "sharepoint_server", title: "Microsoft SharePoint Server", part: "a" },
  esxi: { vendor: "vmware", product: "esxi", title: "VMware ESXi", part: "o" },
  vcenter: { vendor: "vmware", product: "vcenter_server", title: "VMware vCenter Server", part: "a" },
  confluence: { vendor: "atlassian", product: "confluence", title: "Atlassian Confluence", part: "a" },
  jira: { vendor: "atlassian", product: "jira", title: "Atlassian Jira", part: "a" },
  jenkins: { vendor: "jenkins", product: "jenkins", title: "Jenkins", part: "a" },
  gitlab: { vendor: "gitlab", product: "gitlab", title: "GitLab", part: "a" },
  wordpress: { vendor: "wordpress", product: "wordpress", title: "WordPress", part: "a" },
  fortios: { vendor: "fortinet", product: "fortios", title: "Fortinet FortiOS", part: "o" },
  fortigate: { vendor: "fortinet", product: "fortios", title: "Fortinet FortiOS", part: "o" },
  moveit: { vendor: "progress", product: "moveit_transfer", title: "Progress MOVEit Transfer", part: "a" },
  openssl: { vendor: "openssl", product: "openssl", title: "OpenSSL", part: "a" },
  sudo: { vendor: "sudo_project", product: "sudo", title: "Sudo", part: "a" },
  curl: { vendor: "haxx", product: "curl", title: "curl", part: "a" },
  routeros: { vendor: "mikrotik", product: "routeros", title: "MikroTik RouterOS", part: "o" },
  mikrotik: { vendor: "mikrotik", product: "routeros", title: "MikroTik RouterOS", part: "o" },
};
// Products distros ship via their package manager — a version-string match can be
// a backport false positive. Chip the caveat on these, don't flip the verdict.
const DISTRO_PACKAGED = new Set(["openssh", "http_server", "openssl", "log4j", "sudo", "curl", "bash", "glibc", "nginx", "python"]);
const NOISE = new Set(["x64", "x86", "64", "32", "bit", "en", "us", "gb", "ru", "az", "tr", "version", "edition", "inc", "llc", "ltd", "corp", "corporation", "software", "the", "server", "open", "source"]);

export function normProduct(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(64|32)[-\s]?bit\b/g, " ")
    .replace(/[^a-z0-9+.#\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !NOISE.has(t))
    .join(" ")
    .trim();
}

function aliasFor(query: string): Cpe | null {
  for (const t of normProduct(query).split(/\s+/)) if (ALIAS[t]) return ALIAS[t];
  return null;
}

// Score every CPE-dictionary hit; return the best plus scored runners-up so the
// UI can offer a pick when confidence is low (the Ivanti-on-Pulse-client trap).
async function resolveCpeRaw(query: string): Promise<{ best: Cpe | null; candidates: Cpe[]; confidence: "high" | "low" }> {
  const d = await nvd<{ products?: { cpe: { cpeName: string; titles?: { title: string; lang: string }[] } }[] }>(
    `${NVD}/cpes/2.0?keywordSearch=${encodeURIComponent(query)}&resultsPerPage=40`,
  );
  const rows = d?.products ?? [];
  const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = new Map<string, { score: number; cpe: Cpe }>();
  for (const row of rows) {
    const parts = row.cpe.cpeName.split(":");
    if (parts.length < 6) continue;
    const part = parts[2], vendor = parts[3], product = parts[4];
    if (vendor === "*" || product === "*") continue;
    const title = row.cpe.titles?.find((t) => t.lang === "en")?.title || `${vendor} ${product}`;
    const prodWords = product.replace(/_/g, " ");
    let score = part === "a" ? 2 : part === "o" ? 1 : 0;
    for (const t of qTokens) {
      if (product.includes(t)) score += 4;
      if (prodWords.includes(t)) score += 2;
      if (vendor.includes(t)) score += 1;
      if (title.toLowerCase().includes(t)) score += 1;
    }
    if (qTokens.some((t) => product === t || prodWords === t)) score += 6;
    const key = `${vendor}:${product}`;
    const cur = scored.get(key);
    if (!cur || score > cur.score) scored.set(key, { score, cpe: { vendor, product, title, part } });
  }
  const ranked = [...scored.values()].filter((x) => x.score >= 4).sort((a, b) => b.score - a.score);
  if (!ranked.length) return { best: null, candidates: [], confidence: "low" };
  const best = ranked[0];
  const clear = ranked.length === 1 || best.score - ranked[1].score >= 5;
  return { best: best.cpe, candidates: ranked.slice(0, 4).map((r) => r.cpe), confidence: clear ? "high" : "low" };
}

const resolveCpeCached = unstable_cache(
  async (query: string) => resolveCpeRaw(normProduct(query) || query),
  ["stacknix-cpe-v3"],
  { revalidate: 86400 },
);

export async function resolveStack(query: string): Promise<{ best: Cpe | null; candidates: Cpe[]; confidence: "high" | "low" }> {
  const a = aliasFor(query);
  if (a) return { best: a, candidates: [a], confidence: "high" };
  return resolveCpeCached(query);
}

// ---- version comparison (acid-tested, unchanged) -------------------------
export function cmpVersion(a: string, b: string): number | null {
  const norm = (s: string) => s.toLowerCase().replace(/^v/, "").match(/\d+|[a-z]+/g) ?? [];
  const A = norm(a), B = norm(b);
  if (!A.length || !B.length) return null;
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i], y = B[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { const dx = parseInt(x, 10), dy = parseInt(y, 10); if (dx !== dy) return dx < dy ? -1 : 1; }
    else if (xn !== yn) return null;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// ---- CVE pull + local version evaluation ---------------------------------
type CpeMatch = {
  criteria: string; vulnerable?: boolean;
  versionStartIncluding?: string; versionStartExcluding?: string;
  versionEndIncluding?: string; versionEndExcluding?: string;
};
type RawCve = {
  cve: {
    id: string;
    descriptions?: { lang: string; value: string }[];
    metrics?: Record<string, { cvssData?: { baseScore?: number; baseSeverity?: string; vectorString?: string } }[]>;
    references?: { url: string }[];
    published?: string;
    configurations?: { nodes?: { cpeMatch?: CpeMatch[] }[] }[];
  };
};

// Pull EVERY CVE for the product base CPE, paging until the catalog is exhausted
// or we hit a safety cap (a Chrome-scale product would be thousands; cap bounds
// cost). Cached 12h, so this multi-request cold pull is a one-time cost per
// product. This is what lets a famous old KEV (Apache CVE-2021-41773) surface
// even though newer CVEs would push it past a single 200-row page.
const PAGE = 2000; // NVD max per request
const HARD_CAP = 6000; // safety ceiling for pathological products
async function cvesForProductRaw(vendor: string, product: string): Promise<{ cves: RawCve[]; truncated: boolean }> {
  for (const part of ["a", "o"]) {
    const base = `${NVD}/cves/2.0?virtualMatchString=cpe:2.3:${part}:${vendor}:${product}:*:*:*:*:*:*:*:*`;
    const first = await nvd<{ vulnerabilities?: RawCve[]; totalResults?: number }>(`${base}&resultsPerPage=${PAGE}`, 15000);
    if (!first?.vulnerabilities?.length) continue;
    const total = first.totalResults ?? first.vulnerabilities.length;
    const out = [...first.vulnerabilities];
    let idx = out.length;
    while (idx < total && idx < HARD_CAP) {
      const pg = await nvd<{ vulnerabilities?: RawCve[] }>(`${base}&resultsPerPage=${PAGE}&startIndex=${idx}`, 15000);
      if (!pg?.vulnerabilities?.length) break;
      out.push(...pg.vulnerabilities);
      idx += pg.vulnerabilities.length;
    }
    return { cves: out, truncated: total > HARD_CAP };
  }
  return { cves: [], truncated: false };
}

const cvesForProduct = unstable_cache(
  async (vendor: string, product: string) => cvesForProductRaw(vendor, product),
  ["stacknix-cves-v3"],
  { revalidate: 43200 },
);

export type Verdict = "vulnerable" | "not-affected" | "unconfirmed" | "version-unknown";

// Evaluate the submitted version against a CVE's cpeMatch rules for our product,
// and capture the evidence: which bound fired, and the fix version. The fix we
// report is the nearest patched release ABOVE the user's version (the end of the
// branch they sit in) — not the global-min fix, which for a multi-branch CVE like
// Log4Shell would tell a 2.14.1 user to "upgrade to 2.3.1", a downgrade.
function evalMatch(version: string | null, matches: CpeMatch[]): { verdict: Verdict; bound: string | null; fixedVersion: string | null; matchedCpe: string | null } {
  if (!matches.length) return { verdict: "unconfirmed", bound: null, fixedVersion: null, matchedCpe: null };
  let fixedVersion: string | null = null;
  for (const m of matches) {
    if (m.versionEndExcluding && (!fixedVersion || (cmpVersion(m.versionEndExcluding, fixedVersion) ?? 1) < 0)) fixedVersion = m.versionEndExcluding;
  }
  if (!version) return { verdict: "version-unknown", bound: null, fixedVersion, matchedCpe: matches[0].criteria };
  // Nearest patched release above what the user runs: the smallest
  // versionEndExcluding strictly greater than their version.
  let fixAbove: string | null = null;
  for (const m of matches) {
    if (m.versionEndExcluding && (cmpVersion(m.versionEndExcluding, version) ?? -1) > 0
        && (!fixAbove || (cmpVersion(m.versionEndExcluding, fixAbove) ?? 1) < 0)) fixAbove = m.versionEndExcluding;
  }
  // Never advise a "fix" at or below what the user runs — a downgrade doesn't
  // remediate. When we can't name a concrete release above them (e.g. the range
  // is versionEndIncluding), report null; the matched bound still shows the ceiling.
  const safeFix = (cand: string | null): string | null =>
    cand && (cmpVersion(cand, version) ?? -1) > 0 ? cand : null;
  let sawRange = false, sawExact = false;
  for (const m of matches) {
    if (m.vulnerable === false) continue;
    const cpeVer = m.criteria.split(":")[5];
    const hasBounds = m.versionStartIncluding || m.versionStartExcluding || m.versionEndIncluding || m.versionEndExcluding;
    if (hasBounds) {
      sawRange = true;
      let ok = true;
      const chk = (bound: string | undefined, cond: (c: number) => boolean) => {
        if (!bound) return true;
        const c = cmpVersion(version, bound);
        if (c === null) { ok = false; return false; } // ambiguous → can't confirm
        return cond(c);
      };
      let unconf = false;
      if (m.versionStartIncluding && !chk(m.versionStartIncluding, (c) => c >= 0)) { if (cmpVersion(version, m.versionStartIncluding) === null) unconf = true; ok = false; }
      if (ok && m.versionStartExcluding && !chk(m.versionStartExcluding, (c) => c > 0)) { if (cmpVersion(version, m.versionStartExcluding) === null) unconf = true; ok = false; }
      if (ok && m.versionEndIncluding && !chk(m.versionEndIncluding, (c) => c <= 0)) { if (cmpVersion(version, m.versionEndIncluding) === null) unconf = true; ok = false; }
      if (ok && m.versionEndExcluding && !chk(m.versionEndExcluding, (c) => c < 0)) { if (cmpVersion(version, m.versionEndExcluding) === null) unconf = true; ok = false; }
      if (unconf) return { verdict: "unconfirmed", bound: null, fixedVersion, matchedCpe: m.criteria };
      if (ok) {
        const lo = m.versionStartIncluding ? `[${m.versionStartIncluding}` : m.versionStartExcluding ? `(${m.versionStartExcluding}` : "(−∞";
        const hi = m.versionEndExcluding ? `${m.versionEndExcluding})` : m.versionEndIncluding ? `${m.versionEndIncluding}]` : "∞)";
        const which = m.versionEndExcluding ? "versionEndExcluding" : m.versionEndIncluding ? "versionEndIncluding" : m.versionStartIncluding ? "versionStartIncluding" : "versionStartExcluding";
        return { verdict: "vulnerable", bound: `${version} ∈ ${lo}, ${hi} · ${which}`, fixedVersion: safeFix(m.versionEndExcluding ?? fixAbove ?? fixedVersion), matchedCpe: m.criteria };
      }
    } else if (cpeVer && cpeVer !== "*" && cpeVer !== "-") {
      sawExact = true;
      if (cmpVersion(version, cpeVer) === 0) return { verdict: "vulnerable", bound: `${version} = ${cpeVer} · exact`, fixedVersion: safeFix(fixAbove ?? fixedVersion), matchedCpe: m.criteria };
    } else {
      return { verdict: "unconfirmed", bound: null, fixedVersion, matchedCpe: m.criteria };
    }
  }
  return { verdict: sawRange || sawExact ? "not-affected" : "unconfirmed", bound: null, fixedVersion, matchedCpe: matches[0].criteria };
}

export type Tier = 1 | 2 | 3 | 4 | 0;
export type Caveat = "possible-backport" | "name-collision" | "no-version-data";

export type Finding = {
  cve: string;
  verdict: Verdict;
  tier: Tier;
  kev: boolean;
  kevDateAdded: string | null;
  ransomware: boolean;
  epss: number | null;
  epssPercentile: number | null;
  cvss: number | null;
  severity: string | null;
  cvssVector: string | null;
  matchedBound: string | null;
  matchedCpe: string | null;
  fixedVersion: string | null;
  caveats: Caveat[];
  summary: string;
  refs: string[];
  published: string | null;
};

export type StackItemResult = {
  input: string;
  product: string;
  version: string | null;
  resolved: { vendor: string; product: string; title: string } | null;
  resolutionConfidence: "high" | "low" | "none";
  candidates: Cpe[];
  findings: Finding[];
  counts: { vulnerable: number; kev: number; unconfirmed: number; notAffected: number; total: number };
  truncated: boolean;
  note: string | null;
};

function cvssOf(c: RawCve["cve"]): { score: number | null; sev: string | null; vector: string | null } {
  const metrics = c.metrics || {};
  for (const k of ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const a = metrics[k];
    if (a && a[0]?.cvssData?.baseScore != null)
      return { score: a[0].cvssData.baseScore ?? null, sev: (a[0].cvssData.baseSeverity || "").toLowerCase() || null, vector: a[0].cvssData.vectorString || null };
  }
  return { score: null, sev: null, vector: null };
}

function tierOf(f: { verdict: Verdict; kev: boolean; epss: number | null; cvss: number | null }): Tier {
  if (f.verdict === "not-affected") return 0;
  if (f.verdict === "vulnerable") {
    if (f.kev) return 1;
    if ((f.epss ?? 0) >= 0.1) return 2;
    if ((f.cvss ?? 0) >= 7.0) return 3;
    return 3;
  }
  return 4; // unconfirmed / version-unknown range hits
}

const RANK: Record<Verdict, number> = { vulnerable: 3, "version-unknown": 2, unconfirmed: 1, "not-affected": 0 };

async function assessOne(line: StackLine, kev: Map<string, KevRow>): Promise<StackItemResult> {
  const res = await resolveStack(line.product);
  if (!res.best) {
    return {
      input: line.raw, product: line.product, version: line.version, resolved: null,
      resolutionConfidence: "none", candidates: res.candidates, findings: [],
      counts: { vulnerable: 0, kev: 0, unconfirmed: 0, notAffected: 0, total: 0 }, truncated: false, note: "unresolved",
    };
  }
  const cpe = res.best;
  const pull = await cvesForProduct(cpe.vendor, cpe.product);
  const raw = pull.cves;
  const truncated = pull.truncated;
  const distro = DISTRO_PACKAGED.has(cpe.product);
  const findings: Finding[] = [];
  for (const rc of raw) {
    const c = rc.cve;
    const matches: CpeMatch[] = [];
    for (const cfg of c.configurations || [])
      for (const node of cfg.nodes || [])
        for (const cm of node.cpeMatch || [])
          if (cm.criteria.includes(`:${cpe.vendor}:${cpe.product}:`)) matches.push(cm);
    const ev = evalMatch(line.version, matches);
    const cid = c.id.toUpperCase();
    const krow = kev.get(cid);
    const { score, sev, vector } = cvssOf(c);
    const caveats: Caveat[] = [];
    if (!line.version) caveats.push("no-version-data");
    if (distro && (ev.verdict === "vulnerable" || ev.verdict === "unconfirmed")) caveats.push("possible-backport");
    if (res.confidence === "low") caveats.push("name-collision");
    findings.push({
      cve: cid,
      verdict: ev.verdict,
      tier: tierOf({ verdict: ev.verdict, kev: !!krow, epss: null, cvss: score }),
      kev: !!krow,
      kevDateAdded: krow?.dateAdded ?? null,
      ransomware: krow?.ransomware ?? false,
      epss: null,
      epssPercentile: null,
      cvss: score,
      severity: sev,
      cvssVector: vector,
      matchedBound: ev.bound,
      matchedCpe: ev.matchedCpe,
      fixedVersion: ev.fixedVersion,
      caveats,
      summary: (c.descriptions || []).find((d) => d.lang === "en")?.value?.slice(0, 240) || "",
      refs: (c.references || []).map((r) => r.url).slice(0, 4),
      published: c.published || null,
    });
  }
  // batch EPSS (score + percentile) and finalize tiers now that EPSS is known
  const relevant = findings.filter((f) => f.verdict !== "not-affected").map((f) => f.cve);
  const epss = await epssDetailed(relevant);
  for (const f of findings) {
    const e = epss.get(f.cve);
    if (e) { f.epss = e.score; f.epssPercentile = e.percentile; }
    f.tier = tierOf({ verdict: f.verdict, kev: f.kev, epss: f.epss, cvss: f.cvss });
  }
  findings.sort(
    (a, b) =>
      RANK[b.verdict] - RANK[a.verdict] ||
      Number(b.kev) - Number(a.kev) ||
      (b.epss ?? -1) - (a.epss ?? -1) ||
      (b.cvss ?? -1) - (a.cvss ?? -1),
  );
  const affected = findings.filter((f) => f.verdict !== "not-affected");
  const notAffected = findings.length - affected.length;
  return {
    input: line.raw, product: line.product, version: line.version,
    resolved: { vendor: cpe.vendor, product: cpe.product, title: cpe.title },
    resolutionConfidence: res.confidence,
    candidates: res.confidence === "low" ? res.candidates : [],
    // keep affected findings + a capped tail of not-affected (for the toggle)
    findings: [...affected.slice(0, 80), ...findings.filter((f) => f.verdict === "not-affected").slice(0, 30)],
    counts: {
      vulnerable: affected.filter((f) => f.verdict === "vulnerable").length,
      kev: affected.filter((f) => f.kev).length,
      unconfirmed: affected.filter((f) => f.verdict === "unconfirmed" || f.verdict === "version-unknown").length,
      notAffected,
      total: findings.length,
    },
    truncated,
    note: line.version ? null : "no-version",
  };
}

export type Coverage = { kevCatalogDate: string | null; epssModelDate: string; nvdRetrievedAt: string };
export type StackReport = {
  items: StackItemResult[];
  summary: {
    stackSize: number;
    resolved: number;
    vulnerable: number;
    kev: number;
    unconfirmed: number;
    worst: Finding | null;
    worstProduct: string | null;
  };
  coverage: Coverage;
};

export async function assessStack(lines: StackLine[]): Promise<StackReport> {
  const kev = await kevMeta();
  const items: StackItemResult[] = [];
  for (const line of lines) items.push(await assessOne(line, kev));

  let worst: Finding | null = null;
  let worstProduct: string | null = null;
  const score = (f: Finding) => (f.kev ? 100 : 0) + (f.epss ?? 0) * 10 + (f.cvss ?? 0) / 10;
  for (const it of items)
    for (const f of it.findings) {
      if (f.verdict !== "vulnerable") continue;
      if (!worst || score(f) > score(worst)) { worst = f; worstProduct = it.resolved?.title || it.product; }
    }
  return {
    items,
    summary: {
      stackSize: lines.length,
      resolved: items.filter((i) => i.resolved).length,
      vulnerable: items.reduce((n, i) => n + i.counts.vulnerable, 0),
      kev: items.reduce((n, i) => n + i.counts.kev, 0),
      unconfirmed: items.reduce((n, i) => n + i.counts.unconfirmed, 0),
      worst,
      worstProduct,
    },
    coverage: {
      kevCatalogDate: kevCatalogDate(),
      epssModelDate: new Date().toISOString().slice(0, 10),
      nvdRetrievedAt: new Date().toISOString(),
    },
  };
}

// ---- the paywall gate ----------------------------------------------------
// Free = proof, not the report: true summary + the single worst finding fully
// rendered + per-item counts. Everything else withheld SERVER-SIDE (never sent),
// so the client lock is a rendering of absence, not a CSS blur.
export type GatedReport = StackReport & { gated: boolean; worstFinding: Finding | null };

export function gate(report: StackReport, unlocked: boolean): GatedReport {
  if (unlocked) return { ...report, gated: false, worstFinding: null };
  const worst = report.summary.worst;
  const items = report.items.map((it) => ({
    ...it,
    // strip every finding except the one worst (kept by CVE id); keep counts
    findings: it.findings
      .filter((f) => worst && f.cve === worst.cve)
      .map((f) => f),
  }));
  return { ...report, items, gated: true, worstFinding: worst };
}
