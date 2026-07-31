// Client-safe IOC extraction. Pulls indicators out of free text (a story's
// title + body) with conservative regexes, then presents them *defanged*
// (hxxp, [.]) so the page never renders a live-clickable malicious link.
//
// The AZ body is an AI summary, so raw indicators are often absent — that's
// expected; the enrichment path (/api/ioc-enrich) covers the empty case.

export type IocType =
  | "ipv4"
  | "domain"
  | "url"
  | "md5"
  | "sha1"
  | "sha256"
  | "email"
  | "btc"
  | "eth";

export type Ioc = { type: IocType; value: string; defanged: string };

// Domains that are references/vendors/press, not indicators.
const BENIGN_DOMAINS = new Set([
  "microsoft.com", "google.com", "apple.com", "amazon.com", "aws.amazon.com",
  "cloudflare.com", "github.com", "gitlab.com", "cisco.com", "oracle.com",
  "adobe.com", "vmware.com", "fortinet.com", "paloaltonetworks.com",
  "mandiant.com", "crowdstrike.com", "sentinelone.com", "kaspersky.com",
  "eset.com", "trendmicro.com", "sophos.com", "checkpoint.com",
  "nvd.nist.gov", "nist.gov", "cisa.gov", "mitre.org", "attack.mitre.org",
  "first.org", "abuse.ch", "virustotal.com", "shodan.io",
  "twitter.com", "x.com", "t.me", "telegram.org", "linkedin.com",
  "facebook.com", "youtube.com", "reddit.com", "wikipedia.org",
  "bleepingcomputer.com", "thehackernews.com", "securityweek.com",
  "krebsonsecurity.com", "therecord.media", "darkreading.com",
  "theregister.com", "arstechnica.com", "wired.com", "zdnet.com",
  "bankinfosecurity.com", "hackread.com", "ctiaze.tech",
]);

// Common file extensions that a bare "name.ext" token would falsely match as a
// domain.
const FILE_EXTS = new Set([
  "exe", "dll", "sys", "bat", "ps1", "vbs", "js", "jar", "py", "sh",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf", "rtf", "csv",
  "zip", "rar", "7z", "gz", "tar", "iso", "img", "bin", "dat",
  "png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "mp4", "mp3",
  "html", "htm", "php", "asp", "aspx", "json", "xml", "txt", "log",
  "dmg", "pkg", "apk", "msi", "lnk", "scr", "hta", "wsf",
  // config / dump / build files that read as "name.ext" and falsely match a domain
  "yml", "yaml", "toml", "ini", "conf", "cfg", "env", "lock", "hprof",
  "md", "sql", "db", "pem", "key", "crt", "pcap", "class", "so", "o",
]);

// Refang so the same regex catches both fanged and analyst-defanged text.
function refang(s: string): string {
  return s
    .replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]| dot /gi, ".")
    .replace(/\[:\]/g, ":")
    .replace(/\[@\]|\[at\]/gi, "@")
    .replace(/hxxp/gi, "http")
    .replace(/fxp/gi, "ftp");
}

function defangDomain(v: string): string {
  return v.replace(/\./g, "[.]");
}
function defangUrl(v: string): string {
  return v.replace(/^http/i, "hxxp").replace(/\./g, "[.]");
}
function defangEmail(v: string): string {
  return v.replace(/@/g, "[@]").replace(/\./g, "[.]");
}

const RE_URL = /\bhttps?:\/\/[^\s<>"'`)\]]+/gi;
const RE_EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}\b/gi;
const RE_SHA256 = /\b[a-f0-9]{64}\b/gi;
const RE_SHA1 = /\b[a-f0-9]{40}\b/gi;
const RE_MD5 = /\b[a-f0-9]{32}\b/gi;
const RE_ETH = /\b0x[a-f0-9]{40}\b/gi;
const RE_BTC = /\b(?:bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g;
const RE_IPV4 =
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const RE_DOMAIN =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi;

function push(map: Map<string, Ioc>, ioc: Ioc) {
  const key = `${ioc.type}:${ioc.value.toLowerCase()}`;
  if (!map.has(key)) map.set(key, ioc);
}

function isPrivateOrTrivialIp(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254) ||
    ip === "255.255.255.255"
  );
}

export function extractIocs(...texts: (string | undefined | null)[]): Ioc[] {
  const raw = texts.filter(Boolean).join("\n");
  if (!raw) return [];
  const text = refang(raw);
  const out = new Map<string, Ioc>();

  // Track spans already consumed by higher-priority matches so a URL's host or
  // an email's domain isn't also emitted as a bare domain.
  const consumed: string[] = [];

  for (const m of text.matchAll(RE_URL)) {
    const v = m[0].replace(/[.,;:)\]]+$/, "");
    consumed.push(v);
    push(out, { type: "url", value: v, defanged: defangUrl(v) });
  }
  for (const m of text.matchAll(RE_EMAIL)) {
    const v = m[0].toLowerCase();
    consumed.push(v);
    push(out, { type: "email", value: v, defanged: defangEmail(v) });
  }
  for (const m of text.matchAll(RE_SHA256))
    push(out, { type: "sha256", value: m[0].toLowerCase(), defanged: m[0].toLowerCase() });
  for (const m of text.matchAll(RE_ETH))
    push(out, { type: "eth", value: m[0].toLowerCase(), defanged: m[0] });
  // SHA1/MD5 after SHA256 so the 64-char run isn't re-split; guard by exact
  // word length via the \b anchors already in each pattern.
  for (const m of text.matchAll(RE_SHA1))
    push(out, { type: "sha1", value: m[0].toLowerCase(), defanged: m[0].toLowerCase() });
  for (const m of text.matchAll(RE_MD5))
    push(out, { type: "md5", value: m[0].toLowerCase(), defanged: m[0].toLowerCase() });
  for (const m of text.matchAll(RE_BTC))
    push(out, { type: "btc", value: m[0], defanged: m[0] });
  for (const m of text.matchAll(RE_IPV4)) {
    const v = m[0];
    if (isPrivateOrTrivialIp(v)) continue;
    // Skip if this IP is a substring of a hash-like run already captured.
    push(out, { type: "ipv4", value: v, defanged: defangDomain(v) });
  }
  for (const m of text.matchAll(RE_DOMAIN)) {
    const v = m[0].toLowerCase();
    if (consumed.some((c) => c.toLowerCase().includes(v))) continue;
    const tld = v.split(".").pop()!;
    if (FILE_EXTS.has(tld)) continue;
    if (BENIGN_DOMAINS.has(v)) continue;
    // Skip apex of a benign domain (e.g. "docs.microsoft.com").
    if ([...BENIGN_DOMAINS].some((b) => v === b || v.endsWith("." + b))) continue;
    if (/^\d+\.\d+$/.test(v)) continue; // version numbers like 3.11
    push(out, { type: "domain", value: v, defanged: defangDomain(v) });
  }

  return [...out.values()];
}

// Defang a value for display given its type (used by the live-enrichment feed,
// which returns fanged values).
export function defang(type: IocType, value: string): string {
  switch (type) {
    case "url":
      return value.replace(/^http/i, "hxxp").replace(/\./g, "[.]");
    case "email":
      return value.replace(/@/g, "[@]").replace(/\./g, "[.]");
    case "domain":
    case "ipv4":
      return value.replace(/\./g, "[.]");
    default:
      return value;
  }
}

export const IOC_TYPE_LABEL: Record<IocType, string> = {
  ipv4: "IP",
  domain: "Domen",
  url: "URL",
  md5: "MD5",
  sha1: "SHA1",
  sha256: "SHA256",
  email: "E-poçt",
  btc: "BTC ünvanı",
  eth: "ETH ünvanı",
};
