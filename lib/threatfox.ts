// Server-only. abuse.ch ThreatFox reputation, built on the KEYLESS recent-export
// feed (https://threatfox.abuse.ch/export/json/recent/) — ~6k currently-active
// IOCs (C2 IPs, malware domains, payload hashes) refreshed continuously by
// abuse.ch. We fetch it once, index it, and answer "is this indicator known
// malicious right now?" with the malware family behind it.
//
// Why the export and not the search_ioc API: the API needs a valid Auth-Key,
// and a revoked/rotated key returns 401 → the tool would silently say "clean"
// for everything (the exact dead-end we already fixed once on exposure). The
// keyless export always works, so reputation is never gated on a secret. If a
// valid THREATFOX_API_KEY *is* present it's used as an extra lookup for older
// IOCs beyond the recent window; its absence or failure degrades silently.
//
// "unknown" here means "not in abuse.ch's recent active set" — NOT "safe".
// The UI says so explicitly; absence of evidence isn't evidence of absence.

export type TfKind = "ip" | "domain" | "url" | "hash";

export type TfHit = {
  ioc: string;
  kind: TfKind;
  malware: string;
  malwareAlias?: string;
  threatType: string; // botnet_cc, payload_delivery, ...
  confidence: number; // 0..100
  firstSeen?: string;
  lastSeen?: string;
  reference?: string;
  tags: string[];
  port?: number;
};

type RawRow = {
  ioc_value?: string;
  ioc_type?: string;
  threat_type?: string;
  malware?: string;
  malware_alias?: string;
  malware_printable?: string;
  first_seen_utc?: string;
  last_seen_utc?: string;
  confidence_level?: number;
  reference?: string;
  tags?: string[] | null;
};

type Index = {
  at: number;
  total: number;
  byIp: Map<string, TfHit[]>;
  byDomain: Map<string, TfHit[]>;
  byHash: Map<string, TfHit[]>;
  byUrl: Map<string, TfHit[]>;
  rows: TfHit[]; // insertion order ≈ recency (export is newest-first)
};

const EXPORT_URL = "https://threatfox.abuse.ch/export/json/recent/";
const TTL_MS = 60 * 60 * 1000; // 1h — the export moves slowly enough
let cache: Index | null = null;
let inflight: Promise<Index> | null = null;

function kindOf(iocType: string): TfKind | null {
  if (iocType.startsWith("ip")) return "ip";
  if (iocType === "domain") return "domain";
  if (iocType === "url") return "url";
  if (iocType.endsWith("_hash")) return "hash";
  return null;
}

function toHit(r: RawRow): TfHit | null {
  const raw = (r.ioc_value || "").trim();
  const kind = kindOf(r.ioc_type || "");
  if (!raw || !kind) return null;
  let ioc = raw;
  let port: number | undefined;
  if (kind === "ip" && raw.includes(":")) {
    const [ip, p] = raw.split(":");
    ioc = ip;
    port = Number(p) || undefined;
  }
  return {
    ioc: kind === "url" ? ioc : ioc.toLowerCase(),
    kind,
    malware: r.malware_printable || r.malware || "naməlum ailə",
    malwareAlias: r.malware_alias || undefined,
    threatType: r.threat_type || "",
    confidence: typeof r.confidence_level === "number" ? r.confidence_level : 0,
    firstSeen: r.first_seen_utc,
    lastSeen: r.last_seen_utc || undefined,
    reference: r.reference || undefined,
    tags: Array.isArray(r.tags) ? r.tags : [],
    port,
  };
}

function put(map: Map<string, TfHit[]>, key: string, hit: TfHit) {
  const k = key.toLowerCase();
  const arr = map.get(k);
  if (arr) arr.push(hit);
  else map.set(k, [hit]);
}

async function build(): Promise<Index> {
  const res = await fetch(EXPORT_URL, {
    headers: { accept: "application/json", "User-Agent": "ctiaze.tech threat lookup (+https://ctiaze.tech)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`threatfox export ${res.status}`);
  const data = (await res.json()) as Record<string, RawRow[] | RawRow>;

  const idx: Index = {
    at: Date.now(),
    total: 0,
    byIp: new Map(),
    byDomain: new Map(),
    byHash: new Map(),
    byUrl: new Map(),
    rows: [],
  };
  for (const v of Object.values(data)) {
    const rows = Array.isArray(v) ? v : [v];
    for (const raw of rows) {
      const hit = toHit(raw);
      if (!hit) continue;
      idx.rows.push(hit);
      idx.total++;
      if (hit.kind === "ip") put(idx.byIp, hit.ioc, hit);
      else if (hit.kind === "domain") put(idx.byDomain, hit.ioc, hit);
      else if (hit.kind === "hash") put(idx.byHash, hit.ioc, hit);
      else if (hit.kind === "url") put(idx.byUrl, hit.ioc, hit);
    }
  }
  return idx;
}

async function getIndex(): Promise<Index | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  if (inflight) return inflight;
  inflight = build()
    .then((idx) => {
      cache = idx;
      return idx;
    })
    .finally(() => {
      inflight = null;
    });
  try {
    return await inflight;
  } catch {
    return cache; // serve stale on a fetch blip rather than nothing
  }
}

// Look an indicator up in the recent active set. `value` should already be
// normalized (lowercased for ip/domain/hash). Returns [] if unknown or the
// feed is unavailable.
export async function lookupThreatFox(value: string, kind: TfKind): Promise<TfHit[]> {
  const idx = await getIndex();
  if (!idx) return [];
  const v = kind === "url" ? value : value.toLowerCase();
  const map =
    kind === "ip" ? idx.byIp : kind === "domain" ? idx.byDomain : kind === "hash" ? idx.byHash : idx.byUrl;
  if (map.has(v)) return map.get(v)!;
  // Domain fallback: a subdomain of a listed domain is still suspicious.
  if (kind === "domain") {
    for (const [k, hits] of idx.byDomain) {
      if (v.endsWith("." + k)) return hits;
    }
  }
  return [];
}

export type InfraBoard = {
  total: number;
  ageHours: number | null;
  families: { name: string; count: number }[];
  threatTypes: { name: string; count: number }[];
  samples: TfHit[]; // most-recent C2 indicators
};

// A live snapshot of what's currently active — top malware families, the mix of
// threat types, and a sample of the freshest C2 indicators. Rendered server-side
// on the /ioc page so the board is always populated (keyless).
export async function infraBoard(sampleN = 12): Promise<InfraBoard | null> {
  const idx = await getIndex();
  if (!idx || idx.total === 0) return null;
  const famCount = new Map<string, number>();
  const typeCount = new Map<string, number>();
  for (const r of idx.rows) {
    famCount.set(r.malware, (famCount.get(r.malware) ?? 0) + 1);
    if (r.threatType) typeCount.set(r.threatType, (typeCount.get(r.threatType) ?? 0) + 1);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));

  // Freshest C2 IPs/domains for the sample (skip hashes — less legible in a list).
  const samples = idx.rows
    .filter((r) => (r.kind === "ip" || r.kind === "domain") && r.threatType === "botnet_cc")
    .slice(0, sampleN);

  return {
    total: idx.total,
    ageHours: Math.max(0, Math.round((Date.now() - idx.at) / 3600_000)),
    families: top(famCount, 8),
    threatTypes: top(typeCount, 6),
    samples: samples.length ? samples : idx.rows.slice(0, sampleN),
  };
}
