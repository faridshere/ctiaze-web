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
      headers: { accept: "application/json", "User-Agent": "ctiaze.tech CVE lookup (+https://ctiaze.tech)" },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// --- CISA KEV, fetched once/day, cached module-level (shared across warm calls) ---
let kevCache: { at: number; set: Set<string> } | null = null;
export async function kevSet(): Promise<Set<string>> {
  if (kevCache && Date.now() - kevCache.at < 24 * 3600_000) return kevCache.set;
  const d = await j<{ vulnerabilities?: { cveID: string }[] }>(
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    8000
  );
  const set = new Set<string>((d?.vulnerabilities || []).map((v) => v.cveID.toUpperCase()));
  if (set.size) kevCache = { at: Date.now(), set };
  return kevCache?.set ?? new Set();
}

export async function epssFor(cve: string): Promise<number | null> {
  const d = await j<{ data?: { cve: string; epss: string }[] }>(
    `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`,
    7000
  );
  const row = d?.data?.[0];
  return row ? parseFloat(row.epss) : null;
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
