import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { lookupThreatFox, type TfHit, type TfKind } from "@/lib/threatfox";
import { kevSet, epssFor, nvdLookup } from "@/lib/cveintel";

// Threat lookup. Paste any single indicator — an IP, domain, URL, file hash, or
// a CVE — and get a verdict:
//   • IP/domain/URL/hash → abuse.ch ThreatFox reputation (keyless recent export):
//     is it known-malicious right now, and behind what malware family. IPs and
//     domains also get geo/operator context (ipwho.is, keyless).
//   • CVE → CISA KEV (actively exploited?) + FIRST EPSS (exploit probability) +
//     NVD (CVSS, description). All keyless — nothing here depends on a secret.

export const revalidate = 0; // dynamic; the libs do their own module-level caching

const RE_CVE = /^cve-\d{4}-\d{3,7}$/i;
const RE_MD5 = /^[a-f0-9]{32}$/i;
const RE_SHA1 = /^[a-f0-9]{40}$/i;
const RE_SHA256 = /^[a-f0-9]{64}$/i;
const RE_IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const RE_DOMAIN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

type Kind = "cve" | TfKind;

function classify(raw: string): { kind: Kind; value: string } | null {
  const s = raw.trim();
  if (!s) return null;
  if (RE_CVE.test(s)) return { kind: "cve", value: s.toUpperCase() };
  if (/^https?:\/\//i.test(s)) return { kind: "url", value: s };
  if (RE_IPV4.test(s)) return { kind: "ip", value: s };
  if (RE_SHA256.test(s) || RE_SHA1.test(s) || RE_MD5.test(s)) return { kind: "hash", value: s.toLowerCase() };
  if (RE_DOMAIN.test(s)) return { kind: "domain", value: s.toLowerCase() };
  return null;
}

function isPublicIPv4(ip: string): boolean {
  const o = ip.split(".").map(Number);
  const [a, b] = o;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  return true;
}

type Identity = { country?: string; countryCode?: string; city?: string; asn?: string; org?: string };

async function ipContext(ip: string): Promise<Identity | undefined> {
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return undefined;
    const w = (await r.json()) as {
      success?: boolean; country?: string; country_code?: string; city?: string;
      connection?: { asn?: number; org?: string; isp?: string };
    };
    if (!w.success) return undefined;
    return {
      country: w.country,
      countryCode: w.country_code,
      city: w.city,
      asn: w.connection?.asn ? `AS${w.connection.asn}` : undefined,
      org: w.connection?.org || w.connection?.isp,
    };
  } catch {
    return undefined;
  }
}

async function resolveDomain(domain: string): Promise<string | null> {
  try {
    const dns = await import("node:dns");
    const addrs = await dns.promises.resolve4(domain);
    return addrs.find((a) => RE_IPV4.test(a)) ?? null;
  } catch {
    return null;
  }
}

function hostOfUrl(u: string): string | null {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!rateLimit(`threat:${clientIp(req)}`, 40, 60_000)) {
    return NextResponse.json({ error: "Too many requests — wait a minute" }, { status: 429 });
  }
  const raw = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!raw) return NextResponse.json({ error: "Enter an indicator" }, { status: 400 });
  if (raw.length > 2048) return NextResponse.json({ error: "Indicator is too long" }, { status: 400 });

  const c = classify(raw);
  if (!c) {
    return NextResponse.json(
      { error: "Unrecognized format — expected an IP, domain, URL, hash (MD5/SHA1/SHA256) or CVE" },
      { status: 400 }
    );
  }

  const cacheHdr = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };

  // ---- CVE branch ----
  if (c.kind === "cve") {
    const [kev, epss, nvd] = await Promise.all([kevSet(), epssFor(c.value), nvdLookup(c.value)]);
    const isKev = kev.has(c.value);
    const verdict: string = isKev
      ? "exploited"
      : (epss ?? 0) >= 0.1 || (nvd?.cvss ?? 0) >= 9
      ? "elevated"
      : nvd
      ? "known"
      : "unknown";
    return NextResponse.json(
      {
        input: c.value,
        kind: "cve",
        verdict,
        cve: {
          id: c.value,
          kev: isKev,
          epss,
          cvss: nvd?.cvss ?? null,
          severity: nvd?.severity ?? null,
          vector: nvd?.vector ?? null,
          description: nvd?.description ?? null,
          published: nvd?.published ?? null,
          refs: nvd?.refs ?? [],
        },
      },
      { headers: cacheHdr }
    );
  }

  // ---- indicator branch (ip / domain / url / hash) ----
  // Guard private/reserved IPs — reputation feeds only carry public infra.
  if (c.kind === "ip" && !isPublicIPv4(c.value)) {
    return NextResponse.json({ error: "Public IPs only — private/reserved addresses are not supported" }, { status: 400 });
  }

  let hits: TfHit[] = await lookupThreatFox(c.value, c.kind);

  // URL: if the exact URL isn't listed, fall back to its host (a listed C2 host
  // is still the relevant signal).
  let resolvedFrom: string | undefined;
  if (c.kind === "url" && hits.length === 0) {
    const host = hostOfUrl(c.value);
    if (host) {
      const asIp = RE_IPV4.test(host);
      hits = await lookupThreatFox(host, asIp ? "ip" : "domain");
      if (hits.length) resolvedFrom = host;
    }
  }

  // Identity for IP/domain so an AZ malicious host shows its geo/operator.
  let identity: Identity | undefined;
  let ipForGeo: string | null = c.kind === "ip" ? c.value : null;
  if (c.kind === "domain") ipForGeo = await resolveDomain(c.value);
  if (ipForGeo && isPublicIPv4(ipForGeo)) identity = await ipContext(ipForGeo);

  const verdict = hits.length > 0 ? "malicious" : "unknown";
  // Highest-confidence hit first.
  hits.sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json(
    {
      input: c.value,
      kind: c.kind,
      verdict,
      hits: hits.slice(0, 12),
      hitCount: hits.length,
      identity,
      resolvedFrom,
      resolvedIp: c.kind === "domain" ? ipForGeo : undefined,
    },
    { headers: cacheHdr }
  );
}
