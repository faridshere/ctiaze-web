import { NextResponse } from "next/server";

// Tiny shared helpers so the handful of mutating/abuse-prone API routes
// (waitlist, hit, challenge, admin login) return errors and bodies the same
// way instead of each hand-rolling NextResponse.json(...) with slightly
// different shapes. Every response here is "no-store": these are never
// content to cache — they're either a mutation result or a fresh signal
// (a PoW challenge, a rate-limit rejection) that must never be served stale
// from a CDN or browser cache.
export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function jsonOk<T = { ok: true }>(body?: T, init?: ResponseInit): NextResponse {
  return NextResponse.json((body ?? { ok: true }) as T | { ok: true }, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers as Record<string, string> | undefined) },
  });
}

// Parses a request body as JSON, returning null instead of throwing on
// malformed/empty input — the one thing every route here used to repeat as
// its own try/catch around req.json().
export async function readJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// Every per-IP rate limit the API surface enforces, declared once so the
// actual numbers are auditable in one table instead of scattered magic
// numbers across routes. Each comment is the "why this number" a reviewer
// would otherwise have to reconstruct from the route itself.
export const RATE = {
  // Early-access signups: generous for a human (incl. a retry after a typo),
  // tight enough to blunt a script stuffing the waitlist.
  waitlist: { limit: 6, windowMs: 60_000 },
  // Visit beacon: fires once per real pageview. Only exists to stop a
  // refresh loop from flooding the free-tier `visits` collection.
  hit: { limit: 30, windowMs: 60_000 },
  // Challenge issuance is cheap (one HMAC), but still capped so the endpoint
  // itself can't be used to spin CPU or memory (the replay guard) for free.
  challenge: { limit: 120, windowMs: 60_000 },
  // Admin login: the one endpoint where guessing wins the whole signup +
  // visitor-IP dataset, so it is the tightest limit on the site.
  adminLogin: { limit: 5, windowMs: 300_000 },
} as const;
