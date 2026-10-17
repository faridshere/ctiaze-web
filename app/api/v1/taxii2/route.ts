import { apiRoot } from "@/lib/taxii";
import { taxiiGuard, taxiiJson } from "@/lib/taxii-http";

// GET /api/v1/taxii2/ — the one TAXII 2.1 API root (lib/taxii.ts).
export async function GET(req: Request) {
  return taxiiGuard(req) ?? taxiiJson(req, 200, apiRoot(), { maxAge: 86400 });
}
