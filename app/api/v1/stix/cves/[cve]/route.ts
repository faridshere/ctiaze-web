import { citedCveBundle, normalizeCve } from "@/lib/cited";
import { getCveCitationsPage } from "@/lib/cited-data";
import { limitCaller } from "@/lib/ratelimit";
import { jsonError } from "@/lib/api";
import { ttlMemo } from "@/lib/memo";
import { pageParam, stixBundleResponse } from "@/lib/taxii-http";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// GET /api/v1/stix/cves/{cve} — every actor a published report ties to this
// CVE, as a STIX 2.1 bundle: the vulnerability, the intrusion-sets, and one
// `exploits` relationship per citing report with its URL and quote
// (lib/cited.ts). Citations whose actor we hold no dossier for are left out
// rather than turned into an intrusion-set named after free text.
// ---------------------------------------------------------------------------
const buildBundle = ttlMemo(
  async (cve: string, page: number) => {
    const { rows, actors, pages, total } = await getCveCitationsPage(cve, page);
    if (!total) return null;
    if (page > pages) return { bundle: null, pages };
    return { bundle: citedCveBundle(cve, rows, actors, page), pages };
  },
  300_000,
  64,
);

export async function GET(req: Request, ctx: { params: Promise<{ cve: string }> }) {
  if (!limitCaller(req, "apiv1stix", 60, 60_000)) {
    return jsonError(429, "Too many requests — 60/min per IP.");
  }
  const { cve: raw } = await ctx.params;
  const cve = normalizeCve(decodeURIComponent(raw));
  if (!cve) return jsonError(400, "Not a CVE id. Expected CVE-YYYY-NNNN.");
  const page = pageParam(req);
  if (page === null) return jsonError(400, "`page` must be a positive integer.");

  let built;
  try {
    built = await buildBundle(cve, page);
  } catch {
    return jsonError(503, "Upstream store unavailable — this is an error, not an uncited CVE.");
  }
  if (!built) return jsonError(404, `No cited actor for ${cve}.`);
  if (!built.bundle) return jsonError(404, `Page ${page} is past the last page (${built.pages}).`);
  return stixBundleResponse(req, built.bundle, { page, pages: built.pages }, `${cve}-cited-stix${page > 1 ? `-p${page}` : ""}.json`);
}
