import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { parseStack, assessStack, gate } from "@/lib/stacknix";

// stacknix — the paid stack-exposure endpoint. POST a stack, get a version-
// adjudicated vulnerability report. The paywall is enforced HERE: without a
// valid key the response carries only the true summary, the single worst
// finding, and per-item counts — every other CVE id/remediation is never sent,
// so the client "lock" is a rendering of absence, not a CSS blur this audience
// would pop open in devtools.
//
// Keys are issued manually to Builder ($49/mo) buyers and listed in the
// STACKNIX_KEYS env (comma-separated) until real auth + Stripe subscriptions
// land in week 2-3. The page and the future public API/MCP tool consume the
// identical JSON object.

export const runtime = "nodejs";
export const maxDuration = 60; // cold multi-product scans fan out to NVD/KEV/EPSS

const KEYS = new Set((process.env.STACKNIX_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean));
const FREE_CAP = 5;
const PAID_CAP = 15;

export async function POST(req: Request) {
  let body: { stack?: unknown; key?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Send JSON { stack: string, key?: string }." }, { status: 400 });
  }

  const stack = typeof body.stack === "string" ? body.stack : "";
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const unlocked = key.length > 0 && KEYS.has(key);

  if (!stack.trim()) {
    return NextResponse.json({ error: "empty_stack", message: "Paste at least one product (e.g. \"apache http_server 2.4.49\")." }, { status: 400 });
  }
  if (key && !unlocked) {
    return NextResponse.json({ error: "invalid_key", message: "That key isn't recognized. Check it, or start Builder to get one." }, { status: 402 });
  }

  // Keyless callers: 3 scans / day / IP (best-effort per instance). Paid keys skip.
  if (!unlocked) {
    const ip = clientIp(req);
    if (!rateLimit(`stacknix:${ip}`, 3, 86_400_000)) {
      return NextResponse.json(
        { error: "rate_limited", message: "3 free scans used today. Builder removes the cap.", retryAfterHours: 24 },
        { status: 429 },
      );
    }
  }

  const lines = parseStack(stack, unlocked ? PAID_CAP : FREE_CAP);
  if (!lines.length) {
    return NextResponse.json({ error: "empty_stack", message: "Nothing parseable in that input." }, { status: 400 });
  }

  const report = await assessStack(lines);
  const gated = gate(report, unlocked);

  return NextResponse.json(gated, {
    headers: {
      // the report is per-input; let the browser reuse an identical POST briefly
      "Cache-Control": "private, max-age=30",
      "X-Stacknix-Tier": unlocked ? "builder" : "free",
    },
  });
}

// A GET tells humans and the future MCP tool what this is, without running a scan.
export function GET() {
  return NextResponse.json({
    endpoint: "/api/stacknix",
    method: "POST",
    body: { stack: "newline- or semicolon-separated 'product version' lines", key: "optional skopnix key for the full report" },
    free: `${FREE_CAP} components/scan · 3 scans/day · summary + worst finding`,
    paid: `${PAID_CAP} components/scan · full ranked report · JSON export`,
    note: "Exposure by version claim — no authentication, no config check, no reachability check.",
  });
}
