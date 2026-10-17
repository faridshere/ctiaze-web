import { limitCaller } from "./ratelimit";
import { etagFor, notModified } from "./etag";
import { absoluteUrl } from "./site";
import { acceptsTaxii, taxiiError, STIX_MEDIA, TAXII_MEDIA } from "./taxii";

// ---------------------------------------------------------------------------
// HTTP plumbing shared by the TAXII routes (app/taxii2, app/api/v1/taxii2)
// and the STIX bundle routes (app/api/v1/stix).
// Same posture as the other v1 routes — per-IP limit, ETag/304, CORS open,
// CDN-cacheable — but every body, errors included, is a TAXII resource in
// the TAXII media type, which is what a TAXII client parses.
// ---------------------------------------------------------------------------

// One budget for the whole server: a client polling a collection makes one
// request per page, so 60/min is ~60k objects a minute.
const LIMIT = 60;

export function taxiiJson(
  req: Request,
  status: number,
  body: unknown,
  opts: { maxAge?: number; headers?: Record<string, string> } = {},
): Response {
  const text = JSON.stringify(body, null, 2);
  const headers: Record<string, string> = {
    "Content-Type": TAXII_MEDIA,
    "Access-Control-Allow-Origin": "*",
    Vary: "Accept",
    ...opts.headers,
  };
  if (status !== 200) {
    return new Response(text, { status, headers: { ...headers, "Cache-Control": "no-store" } });
  }
  const etag = etagFor(text);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  const maxAge = opts.maxAge ?? 3600;
  return new Response(text, {
    headers: {
      ...headers,
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 12}`,
      ETag: etag,
    },
  });
}

export function taxiiFail(req: Request, status: number, title: string, description?: string): Response {
  return taxiiJson(req, status, taxiiError(status, title, description));
}

/** Rate limit and content negotiation; a Response when the request stops here. */
export function taxiiGuard(req: Request): Response | null {
  if (!limitCaller(req, "taxii", LIMIT, 60_000)) {
    return taxiiFail(req, 429, "Too many requests", `${LIMIT}/min per IP.`);
  }
  if (!acceptsTaxii(req.headers.get("accept"))) {
    return taxiiFail(req, 406, "Not Acceptable", `This server speaks ${TAXII_MEDIA}.`);
  }
  return null;
}

/**
 * A STIX bundle from /api/v1/stix/*: the STIX media type, ETag/304, and a
 * Link: rel="next" header when there are more pages (a bundle has no room for
 * paging metadata of its own).
 */
export function stixBundleResponse(
  req: Request,
  bundle: unknown,
  paging: { page: number; pages: number },
  filename: string,
): Response {
  const text = JSON.stringify(bundle, null, 2);
  const etag = etagFor(text);
  if (notModified(req, etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
  const headers: Record<string, string> = {
    "Content-Type": STIX_MEDIA,
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Link, X-Total-Pages, ETag",
    "Content-Disposition": `inline; filename="${filename}"`,
    "X-Total-Pages": String(paging.pages),
    ETag: etag,
  };
  if (paging.page < paging.pages) {
    const next = new URL(req.url);
    next.searchParams.set("page", String(paging.page + 1));
    headers.Link = `<${absoluteUrl(next.pathname + next.search)}>; rel="next"`;
  }
  return new Response(text, { headers });
}

/** `page` as a positive integer (default 1), or null when malformed. */
export function pageParam(req: Request): number | null {
  const raw = new URL(req.url).searchParams.get("page");
  if (raw === null) return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : null;
}
