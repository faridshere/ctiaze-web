import { createHash } from "node:crypto";

// Weak validators for the public API. The bodies are CDN-cached for minutes,
// but a polling client that sends If-None-Match still saves the transfer, and
// a 304 is the cheapest response we can serve.
export function etagFor(body: string): string {
  // The bodies stamp generated_at on every response; strip it so two responses
  // with the same data validate equal and a client's If-None-Match can hit.
  // Anchored to the top-level metadata field only: an unanchored replace would
  // also blank a nested generated_at, letting two genuinely different payloads
  // hash the same.
  const stable = body.replace(/^(\s*\{[\s\S]{0,400}?"generated_at":\s*)"[^"]*"/, '$1""');
  return `W/"${createHash("sha1").update(stable).digest("hex").slice(0, 20)}"`;
}

export function notModified(req: Request, etag: string): boolean {
  const inm = req.headers.get("if-none-match");
  if (!inm) return false;
  // RFC 9110: "*" matches any current representation.
  if (inm.trim() === "*") return true;
  const bare = etag.replace(/^W\//, "");
  return inm.split(",").some((t) => {
    const v = t.trim();
    return v === etag || v === bare || v.replace(/^W\//, "") === bare;
  });
}
