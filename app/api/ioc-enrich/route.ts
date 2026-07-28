import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { defang, type IocType } from "@/lib/ioc";
import { GENERIC_TAGS } from "@/lib/actors";

// Live-IOC enrichment. Given a pivot term (a malware family or actor detected
// in a story that carried no indicators of its own), pull *currently-active*
// IOCs attackers are using for that threat.
//
//   • TweetFeed (https://tweetfeed.live) — keyless, community-sourced, always on.
//   • ThreatFox (abuse.ch) — richer (confidence, malware mapping); used only if
//     a free THREATFOX_API_KEY is configured. Degrades silently when absent.
//
// Results are cached in-memory per instance so we hit the upstreams at most once
// per term per TTL window.

export const revalidate = 0; // route stays dynamic; we do our own caching

type EnrichIoc = {
  type: IocType;
  value: string;
  defanged: string;
  source: "TweetFeed" | "ThreatFox";
  firstSeen?: string;
  tags?: string[];
  ref?: string; // link back to the reporting tweet / ThreatFox entry
  malware?: string;
  confidence?: number;
};

type EnrichMeta = { term: string; generic: boolean; sources: string[] };
const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: EnrichIoc[]; meta: EnrichMeta }>();
const TIMEOUT_MS = 6000;
const MAX_RESULTS = 40;
const VALID_TERM = /^[A-Za-z0-9 ._()-]{1,40}$/;

function mapTweetFeedType(t: string): IocType | null {
  switch (t) {
    case "ip": return "ipv4";
    case "domain": return "domain";
    case "url": return "url";
    case "sha256": return "sha256";
    case "md5": return "md5";
    default: return null;
  }
}

async function fromTweetFeed(term: string, signal: AbortSignal): Promise<EnrichIoc[]> {
  const url = `https://api.tweetfeed.live/v1/month/${encodeURIComponent(term.toLowerCase())}`;
  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{
    date?: string; user?: string; type?: string; value?: string;
    tags?: string[]; tweet?: string;
  }>;
  if (!Array.isArray(rows)) return [];
  const out: EnrichIoc[] = [];
  for (const r of rows) {
    const type = mapTweetFeedType(r.type ?? "");
    if (!type || !r.value) continue;
    out.push({
      type,
      value: r.value,
      defanged: defang(type, r.value),
      source: "TweetFeed",
      firstSeen: r.date,
      tags: r.tags,
      ref: r.tweet,
    });
  }
  return out;
}

function mapThreatFoxType(t: string): IocType | null {
  if (t.startsWith("ip")) return "ipv4";
  if (t === "domain") return "domain";
  if (t === "url") return "url";
  if (t === "sha256_hash") return "sha256";
  if (t === "sha1_hash") return "sha1";
  if (t === "md5_hash") return "md5";
  return null;
}

async function fromThreatFox(term: string, key: string, signal: AbortSignal): Promise<EnrichIoc[]> {
  const res = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "Auth-Key": key },
    body: JSON.stringify({ query: "malwareinfo", malware: term, limit: MAX_RESULTS }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    query_status?: string;
    data?: Array<{
      ioc?: string; ioc_type?: string; malware_printable?: string;
      confidence_level?: number; first_seen?: string; tags?: string[];
    }>;
  };
  if (json.query_status !== "ok" || !Array.isArray(json.data)) return [];
  const out: EnrichIoc[] = [];
  for (const d of json.data) {
    const type = mapThreatFoxType(d.ioc_type ?? "");
    if (!type || !d.ioc) continue;
    // ThreatFox ip IOCs come as ip:port — split the port off for the value.
    const value = type === "ipv4" ? d.ioc.split(":")[0] : d.ioc;
    out.push({
      type,
      value,
      defanged: defang(type, value),
      source: "ThreatFox",
      firstSeen: d.first_seen,
      tags: d.tags,
      malware: d.malware_printable,
      confidence: d.confidence_level,
    });
  }
  return out;
}

function dedupe(iocs: EnrichIoc[]): EnrichIoc[] {
  const seen = new Set<string>();
  const out: EnrichIoc[] = [];
  for (const i of iocs) {
    const k = `${i.type}:${i.value.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

async function enrichOne(
  term: string,
  key: string | undefined,
  signal: AbortSignal
): Promise<EnrichIoc[]> {
  const tasks: Promise<EnrichIoc[]>[] = [
    fromTweetFeed(term, signal).catch(() => []),
  ];
  // ThreatFox is family/actor-oriented — don't waste a call on a generic tag.
  if (key && !GENERIC_TAGS.has(term)) {
    tasks.push(fromThreatFox(term, key, signal).catch(() => []));
  }
  const results = (await Promise.all(tasks)).flat();
  return dedupe(
    results.sort((a, b) =>
      a.source === b.source ? 0 : a.source === "ThreatFox" ? -1 : 1
    )
  ).slice(0, MAX_RESULTS);
}

export async function GET(req: Request) {
  if (!rateLimit(`enrich:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  // Accept a priority-ordered candidate list (specific → generic); the first
  // term that returns live indicators wins.
  const raw = new URL(req.url).searchParams.get("term")?.trim() ?? "";
  const terms = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => VALID_TERM.test(t))
    .slice(0, 6);
  if (terms.length === 0) {
    return NextResponse.json({ error: "invalid_term" }, { status: 400 });
  }

  const cacheKey = terms.join(",").toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json(
      { ...cached.meta, iocs: cached.data, cached: true },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const key = process.env.THREATFOX_API_KEY;
  try {
    let matchedTerm = terms[terms.length - 1];
    let iocs: EnrichIoc[] = [];
    for (const term of terms) {
      const got = await enrichOne(term, key, controller.signal);
      if (got.length > 0) {
        matchedTerm = term;
        iocs = got;
        break;
      }
    }
    const meta = {
      term: matchedTerm,
      generic: GENERIC_TAGS.has(matchedTerm),
      sources: key ? ["ThreatFox", "TweetFeed"] : ["TweetFeed"],
    };
    cache.set(cacheKey, { at: Date.now(), data: iocs, meta });
    if (cache.size > 500) {
      const now = Date.now();
      for (const [k, v] of cache) if (now - v.at > TTL_MS) cache.delete(k);
    }
    return NextResponse.json(
      { ...meta, iocs },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ term: terms[0], iocs: [], error: "upstream_unavailable" });
  } finally {
    clearTimeout(timer);
  }
}
