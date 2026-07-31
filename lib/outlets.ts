// Outlet tickers — Ground News wears source attribution proudly, so every story
// carries its single outlet as a short code ("mənbə · BLC ↗"). Explicit codes for
// the outlets the feed actually draws from; a deterministic fallback keeps any
// new source legible without a code entry. This is HONEST single-source
// attribution — never a fabricated "covered by N sources" count.

const OUTLETS: Record<string, string> = {
  "bleepingcomputer.com": "BLC",
  "thehackernews.com": "THN",
  "securityweek.com": "SCW",
  "securityaffairs.com": "SCA",
  "helpnetsecurity.com": "HNS",
  "darkreading.com": "DRK",
  "therecord.media": "REC",
  "krebsonsecurity.com": "KRB",
  "bankinfosecurity.com": "BIS",
  "theregister.com": "REG",
  "hackread.com": "HKR",
  "infosecurity-magazine.com": "ISM",
  "cyberscoop.com": "CYS",
  "wired.com": "WRD",
  "arstechnica.com": "ARS",
  "zdnet.com": "ZDN",
  "reddit.com": "RDT",
  "nitter.net": "X",
  "twitter.com": "X",
  "x.com": "X",
  "cisa.gov": "CISA",
  "nvd.nist.gov": "NVD",
  "securelist.com": "SLI",
  "welivesecurity.com": "ESET",
  "sentinelone.com": "S1",
  "crowdstrike.com": "CRWD",
  "cloudblog.withgoogle.com": "GTI",
  "thezdi.com": "ZDI",
  "googleprojectzero.blogspot.com": "P0",
  "microsoft.com": "MSF",
  "jpcert.or.jp": "JPC",
  "cert.gov.ua": "CTUA",
};

export function outletHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "mənbə";
  }
}

export function outletCode(url: string): string {
  const host = outletHost(url);
  if (host === "mənbə") return "SRC";
  if (OUTLETS[host]) return OUTLETS[host];
  for (const [k, v] of Object.entries(OUTLETS)) if (host.endsWith("." + k)) return v;
  // deterministic fallback: registrable name, vowels stripped, first 3 upper.
  const name = host.split(".").slice(-2, -1)[0] || host;
  const consonants = name.replace(/[aeiou]/gi, "");
  return (consonants || name).slice(0, 3).toUpperCase();
}
