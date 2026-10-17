import { getCitationsForCve } from "@/lib/citations-db";
import { normCve, toPublicCitations } from "@/lib/citations";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";
import { etagFor, notModified } from "@/lib/etag";
import { ttlMemo } from "@/lib/memo";

export const revalidate = 300;

// ---------------------------------------------------------------------------
// GET /api/v1/cves/{id}/actors — the threat actors a source is cited as tying
// to this CVE, each with the verbatim quote and the source url it came from.
// No key, no signup. Every row is a CITATION of a third-party source, never
// our confirmation; a row without a quote or a source url is never served.
// ---------------------------------------------------------------------------
const buildBody = ttlMemo(
  async (cve: string): Promise<string> => {
    const docs = await getCitationsForCve(cve);
    // Canonical actor ids, quote-named citations first (lib/citations.ts).
    const citations = toPublicCitations(docs, (id) => absoluteUrl(`/actors/${id}`));
    return JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        schema: "https://skopnix.com/api/v1/cves/{id}/actors",
        version: 1,
        cve,
        cve_url: absoluteUrl(`/cve/${cve}`),
        note: "Each row is a third-party source cited as tying this actor to this CVE, with the quote that says so and its source_url. relation is what the extractor read: exploited, used_in_campaign or attributed_by_report (an unknown value is served as the weakest, attributed_by_report). actor_in_quote is true when the quote itself names the actor, false when the actor is only named near it. actor_id is canonical: an alias id such as nobelium is served as apt29. A citation, not a confirmation.",
        count: citations.length,
        citations,
      },
      null,
      2,
    );
  },
  120_000,
  64,
);

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!limitCaller(req, "apiv1cveactors", 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  const { id: raw } = await ctx.params;
  const cve = normCve(raw);
  if (!cve) return jsonError(400, `"${raw.slice(0, 40)}" is not a CVE id (CVE-YYYY-NNNN).`);
  let body: string;
  try {
    body = await buildBody(cve);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not an empty list.");
  }
  const etag = etagFor(body);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
      ETag: etag,
    },
  });
}
