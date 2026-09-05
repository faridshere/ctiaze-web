import { issueChallenge } from "@/lib/pow";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { jsonError, jsonOk, RATE } from "@/lib/api";

export const revalidate = 0;

// Hands out a short-lived signed proof-of-work challenge. Bounded per IP so the
// challenge itself can't be used to spin the CPU.
export async function GET(req: Request) {
  if (!rateLimit(`chal:${clientIp(req)}`, RATE.challenge.limit, RATE.challenge.windowMs)) {
    return jsonError(429, "Too many requests");
  }
  return jsonOk(issueChallenge());
}
