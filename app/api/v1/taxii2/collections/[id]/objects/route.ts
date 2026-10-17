import { findCollection, mergeStreams, packPage, parseObjectsQuery, type ObjectsQuery, type TaxiiPage } from "@/lib/taxii";
import { taxiiPrelude } from "@/lib/cited";
import { readAzClaims, readCitedIntel } from "@/lib/cited-data";
import { taxiiFail, taxiiGuard, taxiiJson } from "@/lib/taxii-http";
import { ttlMemo } from "@/lib/memo";

// ---------------------------------------------------------------------------
// GET /api/v1/taxii2/collections/{id}/objects/ — a page of a collection as a
// TAXII 2.1 envelope. Paging is added_after + limit (max 1000 objects) and
// the opaque `next` the previous page returned; X-TAXII-Date-Added-First/Last
// bracket the page. Every page carries the TLP:WHITE marking and the skopnix
// identity, so its references resolve on their own.
//
// No match[] filters: an unknown or unsupported parameter is ignored, as the
// spec allows, rather than silently narrowing the page.
// ---------------------------------------------------------------------------

// Five minutes per distinct page, like /api/v1/claims: a poller re-asking for
// the same added_after costs one read, and the ETag stays stable for its 304.
const buildPage = ttlMemo(
  async (collection: "cited-intel" | "az-claims", q: ObjectsQuery): Promise<TaxiiPage> => {
    const reads = collection === "cited-intel" ? await readCitedIntel(q) : await readAzClaims(q);
    const { stream, truncated } = mergeStreams(reads);
    return packPage(stream, q.limit, taxiiPrelude(), truncated);
  },
  300_000,
  64,
);

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const stop = taxiiGuard(req);
  if (stop) return stop;
  const { id } = await ctx.params;
  const c = findCollection(decodeURIComponent(id));
  if (!c) return taxiiFail(req, 404, "No such collection", "Collections: cited-intel, az-claims.");
  const q = parseObjectsQuery(new URL(req.url).searchParams);
  if ("error" in q) return taxiiFail(req, 400, "Bad request", q.error);

  let page: TaxiiPage;
  try {
    page = await buildPage(c.title, q);
  } catch {
    return taxiiFail(req, 503, "Upstream store unavailable", "This is an error, not an empty collection.");
  }
  const headers: Record<string, string> = {};
  if (page.first) headers["X-TAXII-Date-Added-First"] = page.first;
  if (page.last) headers["X-TAXII-Date-Added-Last"] = page.last;
  return taxiiJson(req, 200, page.envelope, { maxAge: 300, headers });
}
