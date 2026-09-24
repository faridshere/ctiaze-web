// Server-only. CVE triage from three keyless authorities:
//   • CISA KEV  — is it being actively exploited in the wild? (cached daily)
//   • FIRST EPSS — 30-day exploitation probability, for ranking
//   • NVD        — description, CVSS base score/severity, published date, refs
// No API key needed for any of them. NVD is rate-limited (~5 req/30s keyless),
// which is fine for one-CVE-at-a-time interactive lookups.

async function j<T>(url: string, ms: number): Promise<T | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(ms),
      headers: { accept: "application/json", "User-Agent": "skopnix.com CVE lookup (+https://skopnix.com)" },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// --- CISA KEV, fetched once/day, cached module-level (shared across warm calls).
// kevMeta carries the ransomware flag too; kevSet derives from it (one download). ---
export type KevRow = { ransomware: boolean; dateAdded: string | null };
let kevCache: { at: number; map: Map<string, KevRow>; released: string | null } | null = null;
export async function kevMeta(): Promise<Map<string, KevRow>> {
  if (kevCache && Date.now() - kevCache.at < 24 * 3600_000) return kevCache.map;
  const d = await j<{ dateReleased?: string; vulnerabilities?: { cveID: string; dateAdded?: string; knownRansomwareCampaignUse?: string }[] }>(
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    9000
  );
  const map = new Map<string, KevRow>();
  for (const v of d?.vulnerabilities || [])
    map.set(v.cveID.toUpperCase(), { ransomware: (v.knownRansomwareCampaignUse || "").toLowerCase() === "known", dateAdded: v.dateAdded || null });
  if (map.size) kevCache = { at: Date.now(), map, released: d?.dateReleased?.slice(0, 10) || null };
  return kevCache?.map ?? new Map();
}
export function kevCatalogDate(): string | null { return kevCache?.released ?? null; }
export async function kevSet(): Promise<Set<string>> {
  return new Set((await kevMeta()).keys());
}

export async function epssFor(cve: string): Promise<number | null> {
  const d = await j<{ data?: { cve: string; epss: string }[] }>(
    `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`,
    7000
  );
  const row = d?.data?.[0];
  return row ? parseFloat(row.epss) : null;
}

// Batched EPSS for many CVEs in one request (FIRST accepts a comma list).
export async function epssMap(cves: string[]): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (!cves.length) return m;
  const d = await j<{ data?: { cve: string; epss: string }[] }>(
    `https://api.first.org/data/v1/epss?cve=${cves.slice(0, 100).map(encodeURIComponent).join(",")}`,
    8000
  );
  for (const row of d?.data || []) m.set(row.cve.toUpperCase(), parseFloat(row.epss));
  return m;
}

// Batched EPSS with percentile, for the stack engine.
export async function epssDetailed(cves: string[]): Promise<Map<string, { score: number; percentile: number | null }>> {
  const m = new Map<string, { score: number; percentile: number | null }>();
  if (!cves.length) return m;
  const d = await j<{ data?: { cve: string; epss: string; percentile?: string }[] }>(
    `https://api.first.org/data/v1/epss?cve=${cves.slice(0, 100).map(encodeURIComponent).join(",")}`,
    8000
  );
  for (const row of d?.data || []) m.set(row.cve.toUpperCase(), { score: parseFloat(row.epss), percentile: row.percentile ? parseFloat(row.percentile) : null });
  return m;
}

// Cheap "small info" badges for a story's CVEs: KEV (one cached file) + EPSS
// (one batched request). No per-CVE NVD here — the full NVD detail lives on /cve.
export type CveBadge = { kev: boolean; epss: number | null };
export async function cveBadges(cves: string[]): Promise<Map<string, CveBadge>> {
  const out = new Map<string, CveBadge>();
  if (!cves.length) return out;
  const upper = cves.map((c) => c.toUpperCase());
  const [kev, epss] = await Promise.all([kevSet(), epssMap(upper)]);
  for (const c of upper) out.set(c, { kev: kev.has(c), epss: epss.get(c) ?? null });
  return out;
}

export type NvdInfo = {
  description?: string;
  cvss?: number;
  severity?: string;
  vector?: string;
  published?: string;
  refs: string[];
};

export async function nvdLookup(cve: string): Promise<NvdInfo | null> {
  const d = await j<{
    vulnerabilities?: {
      cve: {
        descriptions?: { lang: string; value: string }[];
        metrics?: Record<string, { cvssData?: { baseScore?: number; baseSeverity?: string; vectorString?: string } }[]>;
        references?: { url: string }[];
        published?: string;
      };
    }[];
  }>(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cve)}`, 9000);

  const v = d?.vulnerabilities?.[0]?.cve;
  if (!v) return null;
  const description = (v.descriptions || []).find((x) => x.lang === "en")?.value;
  let cvss: number | undefined;
  let severity: string | undefined;
  let vector: string | undefined;
  const metrics = v.metrics || {};
  for (const mk of ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const arr = metrics[mk];
    if (arr && arr[0]?.cvssData) {
      cvss = arr[0].cvssData.baseScore;
      severity = (arr[0].cvssData.baseSeverity || "").toLowerCase() || undefined;
      vector = arr[0].cvssData.vectorString;
      break;
    }
  }
  return {
    description,
    cvss,
    severity,
    vector,
    published: v.published,
    refs: (v.references || []).map((r) => r.url).slice(0, 5),
  };
}
