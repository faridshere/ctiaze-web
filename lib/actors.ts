// Detects known threat actors and malware families inside a story's text.
// Actor hits render a knowledge card; malware/actor hits become pivot terms
// for live-IOC enrichment (/api/ioc-enrich).

import { ACTORS, MALWARE_FAMILIES, type Actor } from "@/lib/data/actors";

const THREAT_CONTEXT =
  /ransomware|ransom|fidyə|şifrələ|encrypt|malware|zərərli\s*proqram|hack|breach|sızma|APT|threat\s*actor|təhdid|kiberhücum|cyber[- ]?attack|leak|C2|botnet|exploit|istismar/i;

// Whole-token match for one alias. Multi-word aliases allow flexible spacing;
// boundaries use lookarounds so "APT28" isn't matched inside "APT281".
function aliasRegex(alias: string): RegExp {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "i");
}

// Precompile once at module load.
const ACTOR_MATCHERS = ACTORS.map((a) => ({
  actor: a,
  res: a.aliases.map(aliasRegex),
}));
const FAMILY_MATCHERS = MALWARE_FAMILIES.map((f) => ({
  family: f,
  res: f.aliases.map(aliasRegex),
}));

export function detectActors(...texts: (string | undefined | null)[]): Actor[] {
  const text = texts.filter(Boolean).join("\n");
  if (!text) return [];
  const hasContext = THREAT_CONTEXT.test(text);
  const found: Actor[] = [];
  for (const { actor, res } of ACTOR_MATCHERS) {
    if (actor.requiresContext && !hasContext) continue;
    if (res.some((re) => re.test(text))) found.push(actor);
  }
  return found;
}

// Generic threat-category tags the live feed reliably carries. Used as a
// fallback when a story names no specific family the feed happens to have data
// for right now (TweetFeed's per-family coverage is community-sourced and
// sparse), so nearly every security story can still surface live indicators.
export const GENERIC_TAGS = new Set([
  "ransomware", "phishing", "stealer", "botnet", "malware", "scam", "RAT",
]);

function genericPivots(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  if (/ransomware|fidyə|şifrələy/i.test(t)) out.push("ransomware");
  if (/phishing|fişinq|oltaç|fiş­/i.test(t)) out.push("phishing");
  if (/stealer|infostealer|oğurlayıcı|məlumat oğurla/i.test(t)) out.push("stealer");
  if (/botnet|bot şəbəkə/i.test(t)) out.push("botnet");
  if (/\bRAT\b|remote access trojan|uzaqdan idarə troyan/i.test(text)) out.push("RAT");
  if (/malware|zərərli proqram|trojan|troyan|backdoor|arxa qapı/i.test(t)) out.push("malware");
  return out;
}

// Pivot terms for enrichment, most specific first so the feed is queried in
// priority order: matched malware families → named actors → generic category.
export function enrichmentPivots(...texts: (string | undefined | null)[]): string[] {
  const text = texts.filter(Boolean).join("\n");
  if (!text) return [];
  const pivots: string[] = [];
  for (const { family, res } of FAMILY_MATCHERS) {
    if (res.some((re) => re.test(text))) pivots.push(family.name);
  }
  for (const actor of detectActors(text)) {
    // Prefer a single-word, tag-friendly alias for the feed.
    const tag = actor.aliases.find((a) => /^[A-Za-z0-9]+$/.test(a)) ?? actor.name;
    if (!pivots.includes(tag)) pivots.push(tag);
  }
  for (const g of genericPivots(text)) if (!pivots.includes(g)) pivots.push(g);
  return [...new Set(pivots)].slice(0, 6);
}

export function mitreUrl(actor: Actor): string | null {
  return actor.mitre ? `https://attack.mitre.org/groups/${actor.mitre}/` : null;
}

export const ACTOR_TYPE_LABEL: Record<Actor["type"], string> = {
  state: "Dövlət sponsorlu",
  ransomware: "Ransomware",
  cybercrime: "Maliyyə cinayəti",
  hacktivist: "Haktivist",
};
