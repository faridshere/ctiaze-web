// Regenerates lib/domain-data.ts from two public sources:
//   1. publicsuffix.org  — the two-label public suffixes splitDomain() needs
//   2. data.iana.org/rdap/dns.json — which TLDs actually publish RDAP
// Run:  node scripts/gen-domain-data.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r;
}

const pslText = await (await get("https://publicsuffix.org/list/public_suffix_list.dat")).text();
const twoLabel = [
  ...new Set(
    pslText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("*") && !l.startsWith("!"))
      .filter((l) => l.split(".").length === 2)
  ),
].sort();

const bootstrap = await (await get("https://data.iana.org/rdap/dns.json")).json();
const rdapTlds = [
  ...new Set(bootstrap.services.flatMap((s) => s[0].map((t) => t.toLowerCase()))),
].sort();

const header = `// GENERATED DATA — do not hand-edit. Run: node scripts/gen-domain-data.mjs
//
// (1) TWO_LABEL_SUFFIXES — two-label entries of the Public Suffix List
//     (publicsuffix.org, MPL-2.0). splitDomain() needs these so "company.com.az"
//     yields the registrable domain "company.com.az" rather than "com.az". The
//     hand-rolled 9-entry list this replaced silently mis-parsed every .az, .tr
//     and .ge domain — i.e. the site's whole home region.
//
// (2) RDAP_TLDS — the TLDs that actually publish RDAP, from IANA's bootstrap
//     (data.iana.org/rdap/dns.json, public domain). .az .tr .ge .ru .kz .io do
//     NOT, so registration lookups for them can say "this registry doesn't
//     publish RDAP" instead of a misleading "unavailable".
`;

const body = `${header}
const TWO_LABEL_RAW =
  ${JSON.stringify(twoLabel.join(" "))};

export const TWO_LABEL_SUFFIXES: ReadonlySet<string> = new Set(TWO_LABEL_RAW.split(" "));

const RDAP_TLD_RAW =
  ${JSON.stringify(rdapTlds.join(" "))};

export const RDAP_TLDS: ReadonlySet<string> = new Set(RDAP_TLD_RAW.split(" "));
`;

const out = path.join(ROOT, "lib", "domain-data.ts");
fs.writeFileSync(out, body);
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`✓ lib/domain-data.ts — ${twoLabel.length} suffixes, ${rdapTlds.length} rdap tlds, ${kb}KB`);
const azOk = ["com.az", "net.az", "gov.az", "org.az"].every((x) => twoLabel.includes(x));
console.log(`  .az suffixes present: ${azOk ? "yes" : "NO — regeneration failed"}`);
console.log(`  rdap has .az/.io: ${rdapTlds.includes("az")}/${rdapTlds.includes("io")} (expected false/false)`);
