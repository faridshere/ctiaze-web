import { discovery } from "@/lib/taxii";
import { taxiiGuard, taxiiJson } from "@/lib/taxii-http";

// ---------------------------------------------------------------------------
// GET /taxii2/ — TAXII 2.1 discovery: where the API root is. The well-known
// path a TAXII client (OpenCTI, MISP's TAXII module, taxii2-client) is
// pointed at. Read-only and keyless; see lib/taxii.ts.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  return taxiiGuard(req) ?? taxiiJson(req, 200, discovery(), { maxAge: 86400 });
}
