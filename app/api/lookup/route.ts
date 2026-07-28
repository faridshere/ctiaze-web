import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Live exposure lookup, powered by Shodan's FREE InternetDB API
// (https://internetdb.shodan.io/{ip}) — keyless, no query credits, cacheable.
// Deliberately NOT the academic paid host API: this is a public per-visitor
// tool, and 1-credit-per-lookup would burn the 100/mo budget in a day.
// InternetDB exposes only already-public info about public IPs.

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
  if (a === 169 && b === 254) return "private"; // link-local
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 168) return "private";
  if (a === 100 && b >= 64 && b <= 127) return "private"; // CGNAT
  if (a === 192 && b === 0) return "private"; // 192.0.0/24, 192.0.2/24 (doc/reserved)
  if (a === 198 && (b === 18 || b === 19)) return "private"; // benchmarking
  if (a === 198 && b === 51) return "private"; // 198.51.100/24 (doc)
  if (a === 203 && b === 0) return "private"; // 203.0.113/24 (doc)
  if (a >= 224) return "private"; // multicast + reserved
  return "public";
}

function looksIPv6(ip: string): boolean {
  return ip.includes(":") && /^[0-9a-fA-F:]+$/.test(ip);
}

const EMPTY = { ports: [], vulns: [], hostnames: [], tags: [], cpes: [] };

export async function GET(req: Request) {
  if (!rateLimit(`lookup:${clientIp(req)}`, 40, 60_000)) {
    return NextResponse.json({ error: "Çox sorğu göndərdiniz — bir dəqiqə gözləyin" }, { status: 429 });
  }
  const url = new URL(req.url);
  let ip = (url.searchParams.get("ip") || "").trim();
  const own = !ip;
  if (!ip) ip = firstForwarded(req.headers);
  if (!ip) return NextResponse.json({ error: "IP təyin edilə bilmədi" }, { status: 400 });

  if (looksIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === "::1" || low.startsWith("fe80") || low.startsWith("fc") || low.startsWith("fd")) {
      return NextResponse.json({ error: "Özəl / lokal IP dəstəklənmir" }, { status: 400 });
    }
  } else {
    const cls = classifyIPv4(ip);
    if (cls === "invalid") return NextResponse.json({ error: "Yanlış IP formatı" }, { status: 400 });
    if (cls === "private")
      return NextResponse.json({ error: "Yalnız public IP — özəl/reserved ünvanlar dəstəklənmir" }, { status: 400 });
  }

  // Own-IP results are per-visitor, so never CDN-cache them; a specific IP is
  // safe to cache hard (its exposure changes slowly).
  const cache = own
    ? "private, no-store"
    : "public, s-maxage=86400, stale-while-revalidate=604800";

  try {
    const r = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`, {
      headers: { "User-Agent": "ctiaze.tech exposure lookup (+https://ctiaze.tech)" },
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) {
      return NextResponse.json({ ip, own, found: false, ...EMPTY }, { headers: { "Cache-Control": cache } });
    }
    if (!r.ok) {
      return NextResponse.json({ error: "Shodan InternetDB əlçatan deyil" }, { status: 502 });
    }
    const d = await r.json();
    return NextResponse.json(
      {
        ip,
        own,
        found: true,
        ports: Array.isArray(d.ports) ? d.ports : [],
        vulns: Array.isArray(d.vulns) ? d.vulns : [],
        hostnames: Array.isArray(d.hostnames) ? d.hostnames : [],
        tags: Array.isArray(d.tags) ? d.tags : [],
        cpes: Array.isArray(d.cpes) ? d.cpes : [],
      },
      { headers: { "Cache-Control": cache } }
    );
  } catch {
    return NextResponse.json({ error: "Sorğu zaman aşımına uğradı" }, { status: 504 });
  }
}
