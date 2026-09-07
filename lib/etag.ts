import { createHash } from "node:crypto";

// Weak validators for the public API. The bodies are CDN-cached for minutes,
// but a polling client that sends If-None-Match still saves the transfer, and
// a 304 is the cheapest response we can serve.
export function etagFor(body: string): string {
  // The bodies stamp generated_at on every response; strip it so two responses
  // with the same data validate equal and a client's If-None-Match can hit.
  const stable = body.replace(/"generated_at":\s*"[^"]*"/, '"generated_at":""');
  return `W/"${createHash("sha1").update(stable).digest("hex").slice(0, 20)}"`;
}

export function notModified(req: Request, etag: string): boolean {
  const inm = req.headers.get("if-none-match");
  if (!inm) return false;
  return inm.split(",").some((t) => t.trim() === etag || t.trim() === etag.replace(/^W\//, ""));
}
