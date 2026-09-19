// The pure matching core of the wire/actor join, split out of lib/actor-wire.ts
// so it can be unit-tested without pulling in ./db (which throws at import time
// without MONGO_URI_READONLY). Nothing here touches the network or Mongo.
// The UNION of this list and the engine's cti/actors.py `_ALIAS_STOPLIST`,
// which is where it is actually reasoned about — every entry there carries the
// dated measurement that earned it. This copy had drifted 28 words behind and
// so re-opened, on the website alone, the false-positive class the engine had
// already closed: "CHROMIUM" is a MISP alias of Earth Lusca and clears the
// ALL-CAPS branch, so every Chromium story was credited to a Chinese APT;
// "castle" made 26 wrong links in the engine's 2026-09-14 measurement; and
// "everest", "play" and "money" are real crews whose names are ordinary words.
// A few entries here are web-only and deliberately kept — this set is a union,
// never a replacement. To widen it, widen the engine's list and re-copy.
export const STOP = new Set([
  "admin", "aluminium", "aluminum", "apt", "atlas", "bear", "cactus", "castle", "chimera",
  "chromium", "cloud", "cobra", "crypto", "dragon", "eclipse", "embargo", "entropy", "everest",
  "exchange", "falcon", "firewall", "gateway", "ghost", "global", "group", "hunters", "kitten",
  "labs", "lotus", "malware", "medusa", "midnight", "money", "monti", "network", "nova",
  "obscura", "operation", "panda", "payload", "phantom", "phoenix", "play", "quantum",
  "ransom", "ransomware", "raven", "rhysida", "sandbox", "security", "shadow", "silent",
  "silicon", "spider", "storm", "summit", "team", "tiger", "titan", "tortoise", "trigona",
  "unit", "unknown", "unsafe", "vice", "viper", "wildcard", "wolf",
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
