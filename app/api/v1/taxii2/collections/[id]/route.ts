import { findCollection } from "@/lib/taxii";
import { taxiiFail, taxiiGuard, taxiiJson } from "@/lib/taxii-http";

// GET /api/v1/taxii2/collections/{id}/ — one collection, by UUID or by title.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const stop = taxiiGuard(req);
  if (stop) return stop;
  const { id } = await ctx.params;
  const c = findCollection(decodeURIComponent(id));
  if (!c) return taxiiFail(req, 404, "No such collection", "Collections: cited-intel, az-claims.");
  return taxiiJson(req, 200, c, { maxAge: 86400 });
}
