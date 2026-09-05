// The pure matching core of the wire/actor join, split out of lib/actor-wire.ts
// so it can be unit-tested without pulling in ./db (which throws at import time
// without MONGO_URI_READONLY). Nothing here touches the network or Mongo.
export const STOP = new Set([
  "global", "payload", "unsafe", "quantum", "silent", "storm", "eclipse", "cloud", "unknown", "team",
  "group", "admin", "apt", "panda", "bear", "kitten", "spider", "tiger", "dragon", "shadow", "ghost",
  "phantom", "viper", "cobra", "falcon", "raven", "wolf", "tortoise", "lotus", "chimera", "midnight",
  "operation", "unit", "network", "labs", "security", "malware", "ransom", "ransomware", "crypto",
]);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A key is precise enough when it is the primary name (≥4 chars) or an alias
// that carries structure: a digit, a hyphen, several words, or ALL CAPS.
export function matchKeys(name: string, aliases: string[]): string[] {
  const out = new Set<string>();
  const n = (name || "").trim();
  if (n.length >= 4 && !STOP.has(n.toLowerCase())) out.add(n);
  for (const raw of aliases || []) {
    const a = (raw || "").trim();
    if (a.length < 5 || STOP.has(a.toLowerCase()) || /^G\d{4}$/i.test(a)) continue;
    const structured = /\d/.test(a) || a.includes("-") || /\s/.test(a) || (a === a.toUpperCase() && /[A-Z]{5,}/.test(a));
    if (structured) out.add(a);
  }
  return [...out];
}

export function buildMatcher(keys: string[]): RegExp | null {
  if (!keys.length) return null;
  const alts = keys.map((k) => esc(k).replace(/\s+/g, "\\s+"));
  return new RegExp(`(?<![\\w-])(?:${alts.join("|")})(?![\\w-])`, "i");
}
