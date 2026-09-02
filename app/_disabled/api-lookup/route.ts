import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { lookupThreatFox } from "@/lib/threatfox";

// Live exposure lookup. Core source is Shodan's FREE InternetDB
// (https://internetdb.shodan.io/{ip}) — keyless, 0 query credits. But InternetDB
// only has records for IPs where a scan already found open services, so most
// visitor IPs (residential/CGNAT) 404. To avoid a dead-end "clean" shrug, EVERY
// lookup is also enriched with keyless IP-context so it always returns something
// substantive and a graded verdict:
//   • ipwho.is       — geo + ASN + org/ISP (keyless HTTPS)
//   • RIPEstat       — abuse contact ("who do I report this to")
//   • CISA KEV       — flag actively-exploited CVEs (cached daily, module-level)
//   • FIRST EPSS     — exploit-probability, to rank the CVEs
// None of these touch the academic Shodan key, so the 100-credit/mo budget is
// untouched. A domain input is resolved (Cloudflare DoH) to its first A record.

function firstForwarded(h: Headers): string {
  const xff = h.get("x-forwarded-for") || "";
  const first = xff.split(",")[0].trim();
  return first || h.get("x-real-ip") || "";
}

function classifyIPv4(ip: string): "public" | "private" | "invalid" {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return "invalid";
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return "invalid";
  const [a, b] = o;
  if (a === 0 || a === 10 || a === 127) return "private";
  if (a === 169 && b === 254) return "private";
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 168) return "private";
  if (a === 100 && b >= 64 && b <= 127) return "private"; // CGNAT
  if (a === 192 && b === 0) return "private";
  if (a === 198 && (b === 18 || b === 19)) return "private";
  if (a === 198 && b === 51) return "private";
  if (a === 203 && b === 0) return "private";
  if (a >= 224) return "private";
  return "public";
}

function looksIPv4(s: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s);
}
function looksIPv6(ip: string): boolean {
  return ip.includes(":") && /^[0-9a-fA-F:]+$/.test(ip);
}
function looksDomain(s: string): boolean {
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(s);
}

async function j<T>(url: string, ms: number, opts?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// Resolve a domain → first public A record via the Node resolver (works in the
// Vercel Node runtime; more reliable than DoH-over-HTTP).
async function resolveDomain(domain: string): Promise<string | null> {
  try {
    const dns = await import("node:dns");
    const addrs = await dns.promises.resolve4(domain);
    return addrs.find(looksIPv4) ?? null;
  } catch {
    return null;
  }
}

type Identity = {
  country?: string; countryCode?: string; city?: string;
  asn?: string; org?: string; isp?: string; abuse?: string;
};

async function ipContext(ip: string): Promise<Identity> {
  const [who, ripe] = await Promise.all([
    j<{ success?: boolean; country?: string; country_code?: string; city?: string;
        connection?: { asn?: number; org?: string; isp?: string } }>(
      `https://ipwho.is/${encodeURIComponent(ip)}`, 6000),
    j<{ data?: { abuse_contacts?: string[] } }>(
      `https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=${encodeURIComponent(ip)}`, 6000),
  ]);
  const id: Identity = {};
  if (who?.success) {
    id.country = who.country; id.countryCode = who.country_code; id.city = who.city;
    if (who.connection?.asn) id.asn = `AS${who.connection.asn}`;
    id.org = who.connection?.org; id.isp = who.connection?.isp;
  }
  const abuse = ripe?.data?.abuse_contacts?.[0];
  if (abuse) id.abuse = abuse;
  return id;
}

// --- CISA KEV, fetched once/day and cached module-level (shared across warm calls) ---
let kevCache: { at: number; set: Set<string> } | null = null;
async function kevSet(): Promise<Set<string>> {
  if (kevCache && Date.now() - kevCache.at < 24 * 3600_000) return kevCache.set;
  const d = await j<{ vulnerabilities?: { cveID: string }[] }>(
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", 8000);
  const set = new Set<string>((d?.vulnerabilities || []).map((v) => v.cveID.toUpperCase()));
  if (set.size) kevCache = { at: Date.now(), set };
  return kevCache?.set ?? new Set();
}

// FIRST EPSS — exploit probability per CVE (batched).
async function epssMap(cves: string[]): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (!cves.length) return m;
  const d = await j<{ data?: { cve: string; epss: string }[] }>(
    `https://api.first.org/data/v1/epss?cve=${cves.slice(0, 80).join(",")}`, 7000);
  for (const row of d?.data || []) m.set(row.cve.toUpperCase(), parseFloat(row.epss));
  return m;
}

type Vuln = { cve: string; kev: boolean; epss: number | null };

export async function GET(req: Request) {
  if (!rateLimit(`lookup:${clientIp(req)}`, 40, 60_000)) {
    return NextResponse.json({ error: "Too many requests — wait a minute" }, { status: 429 });
  }
  const url = new URL(req.url);
  let input = (url.searchParams.get("ip") || "").trim();
  const own = !input;
  if (!input) input = firstForwarded(req.headers);
  if (!input) return NextResponse.json({ error: "Could not determine an IP" }, { status: 400 });

  // Domain? resolve to an A record so people can check company.az, not just IPs.
  let ip = input;
  let resolvedFrom: string | undefined;
  if (!looksIPv4(input) && !looksIPv6(input)) {
    if (!looksDomain(input))
      return NextResponse.json({ error: "Invalid IP or domain format" }, { status: 400 });
    const r = await resolveDomain(input.toLowerCase());
    if (!r) return NextResponse.json({ error: "Domain could not be resolved (no A record found)" }, { status: 400 });
    ip = r; resolvedFrom = input.toLowerCase();
  }

  if (looksIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === "::1" || low.startsWith("fe80") || low.startsWith("fc") || low.startsWith("fd"))
      return NextResponse.json({ error: "Private / local IPs are not supported" }, { status: 400 });
  } else {
    const cls = classifyIPv4(ip);
    if (cls === "invalid") return NextResponse.json({ error: "Invalid IP format" }, { status: 400 });
    if (cls === "private")
      return NextResponse.json({ error: "Public IPs only — private/reserved addresses are not supported" }, { status: 400 });
  }

  const cache = own
    ? "private, no-store"
    : "public, s-maxage=86400, stale-while-revalidate=604800";

  // InternetDB + IP-context enrichment in parallel — enrichment runs regardless
  // of whether InternetDB has a hit, so a "clean" IP still returns a full card.
  const idbPromise = j<{ ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[]; cpes?: string[] }>(
    `https://internetdb.shodan.io/${encodeURIComponent(ip)}`, 10000,
    { headers: { "User-Agent": "skopnix.com exposure lookup (+https://skopnix.com)" } });
  // Reputation cross-check (keyless abuse.ch ThreatFox live feed) — makes the
  // verdict trustworthy: InternetDB can say "invisible" for an IP that is in
  // fact a known C2, so a malicious-reputation hit overrides everything.
  const repPromise = lookupThreatFox(ip, "ip").catch(() => []);
  const [idb, identity, repHits] = await Promise.all([idbPromise, ipContext(ip), repPromise]);
  const reputation =
    repHits.length > 0
      ? {
          malware: repHits[0].malware,
          threatType: repHits[0].threatType,
          confidence: repHits[0].confidence,
          firstSeen: repHits[0].firstSeen ?? null,
          reference: repHits[0].reference ?? null,
        }
      : null;

  const found = idb !== null;
  const ports = Array.isArray(idb?.ports) ? [...idb!.ports].sort((a, b) => a - b) : [];
  const rawCves = (Array.isArray(idb?.vulns) ? idb!.vulns : []).map((c) => c.toUpperCase());

  // Triage the CVEs: KEV first, then by EPSS.
  let vulns: Vuln[] = [];
  if (rawCves.length) {
    const [kev, epss] = await Promise.all([kevSet(), epssMap(rawCves)]);
    vulns = rawCves
      .map((cve) => ({ cve, kev: kev.has(cve), epss: epss.get(cve) ?? null }))
      .sort((a, b) =>
        (b.kev ? 1 : 0) - (a.kev ? 1 : 0) || (b.epss ?? 0) - (a.epss ?? 0));
  }
  const kevCount = vulns.filter((v) => v.kev).length;

  // Verdict — the user's question, not Shodan's. A known-malicious reputation
  // hit is the strongest signal and outranks the exposure ladder.
  const verdict: "malicious" | "exposed" | "visible" | "invisible" =
    reputation ? "malicious" : vulns.length > 0 ? "exposed" : ports.length > 0 ? "visible" : "invisible";

  return NextResponse.json(
    {
      ip, own, resolvedFrom, verdict, found,
      reputation,
      ports,
      vulns,
      kevCount,
      hostnames: Array.isArray(idb?.hostnames) ? idb!.hostnames : [],
      tags: Array.isArray(idb?.tags) ? idb!.tags : [],
      cpes: Array.isArray(idb?.cpes) ? idb!.cpes : [],
      identity,
    },
    { headers: { "Cache-Control": cache } }
  );
}
