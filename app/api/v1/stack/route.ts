import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { parseApiBody, MAX_COMPONENTS } from "@/lib/stack/parse";
import { checkStack } from "@/lib/stack/server";

export const runtime = "nodejs";
// Cold NVD pulls for a fresh stack take tens of seconds; the check stops
// starting new pulls at 40 s and reports the rest as skipped.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// POST /api/v1/stack — which of these products/versions have CVEs exploited in
// the wild, by whom, and which report says so. No key, no signup.
// Body: { components: [{ name, version, purl?, cpe?, vendor? }] }, at most 500.
// Every actor link carries its evidence quote and source; a row without them
// is never returned. Each finding says how the match was made (confidence).
// ---------------------------------------------------------------------------
const MAX_BODY_BYTES = 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: Request) {
  // Each check can fan out to NVD, so the cap is tighter than the read-only
  // endpoints' 60/min.
  if (!limitCaller(req, "apiv1stack", 10, 60_000)) {
    return jsonError(429, "Too many requests — 10 stack checks/min per IP.");
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return jsonError(413, "Body over 1 MB. Send name/version/purl/cpe rows, not the whole SBOM.");
  let text: string;
  try {
    text = await req.text();
  } catch {
    return jsonError(400, "Could not read the request body.");
  }
  if (text.length > MAX_BODY_BYTES) return jsonError(413, "Body over 1 MB. Send name/version/purl/cpe rows, not the whole SBOM.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return jsonError(400, "Body is not JSON. Send { components: [{ name, version, purl?, cpe? }] }.");
  }
  const parsed = parseApiBody(body);
  if (!parsed.ok) return jsonError(400, parsed.error);

  const report = await checkStack(parsed.components);
  return new Response(
    JSON.stringify({
      note:
        "Exposure by product and version claim only: no configuration, reachability or backport check. KEV = CISA Known Exploited Vulnerabilities. Actor links are quoted from the cited source; confidence says how the product was identified and whether NVD's version ranges were evaluated.",
      ...report,
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...CORS,
      },
    },
  );
}

// A GET describes the endpoint without running a check.
export function GET() {
  return new Response(
    JSON.stringify(
      {
        endpoint: "/api/v1/stack",
        method: "POST",
        body: { components: [{ name: "log4j-core", version: "2.14.1", purl: "pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1" }] },
        limits: { components: MAX_COMPONENTS, body: "1 MB", rate: "10 checks/min per IP" },
        fields: {
          version: "in-range | not-checked | ambiguous | no-version (not-affected CVEs are counted, not listed)",
          confidence: "high = product identified by CPE/purl/curated alias/KEV name AND version in NVD range; medium; low = a name guess",
          actors: "each with evidence (quoted), source and url; never without evidence",
        },
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600", ...CORS } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
