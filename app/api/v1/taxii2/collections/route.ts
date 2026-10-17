import { COLLECTIONS } from "@/lib/taxii";
import { taxiiGuard, taxiiJson } from "@/lib/taxii-http";

// GET /api/v1/taxii2/collections/ — cited-intel and az-claims, both read-only.
export async function GET(req: Request) {
  return taxiiGuard(req) ?? taxiiJson(req, 200, { collections: COLLECTIONS }, { maxAge: 86400 });
}
