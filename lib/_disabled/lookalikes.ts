import { TWO_LABEL_SUFFIXES } from "./domain-data";

// Typosquat / lookalike engine — a focused TypeScript port of the elceef/dnstwist
// fuzzer (Apache-2.0, https://github.com/elceef/dnstwist). Keyless, zero external
// data: the keyboard-adjacency and homoglyph tables are inline. Two uses:
//   1. generateLookalikes(domain) — the variants an attacker would register to
//      phish YOUR domain; resolve them to find the ones that are already live.
//   2. brandMatch(domain) — is the domain the reader pasted a homoglyph/typo fake
//      of a well-known brand, sitting on a different registrable domain?

// qwerty adjacency (US layout) for replacement/insertion fuzzers
const QWERTY: Record<string, string> = {
  q: "12wa", w: "3qed2s", e: "4wrsd3", r: "5etdf4", t: "6rygf5", y: "7tuhg6",
  u: "8yijh7", i: "9uokj8", o: "0iplk9", p: "olp0", a: "qwsz", s: "edxzaw",
  d: "rfcxse", f: "tgvcdr", g: "yhbvft", h: "ujnbgy", j: "ikmnhu", k: "olmji",
  l: "kop", z: "asx", x: "zsdc", c: "xdfv", v: "cfgb", b: "vghn", n: "bhjm", m: "njk",
};
const VOWELS = "aeiou";

// single-character homoglyphs / confusables (a subset of the Unicode confusables +
// dnstwist's glyph table) — enough to catch the phishing-grade fakes
const HOMOGLYPH: Record<string, string[]> = {
  a: ["à", "á", "â", "ä", "å", "ɑ", "а", "ạ", "ǎ", "ă"],
  b: ["ʙ", "Ь", "ḅ", "þ"],
  c: ["ϲ", "с", "ƈ", "ċ", "ç", "ⅽ"],
  d: ["ɗ", "đ", "ď", "ɖ", "ḍ"],
  e: ["é", "ê", "ë", "ē", "ě", "е", "ẹ", "є", "ϵ"],
  g: ["ɢ", "ɡ", "ġ", "ğ", "ǧ", "ɠ"],
  h: ["һ", "ḥ", "ħ", "н"],
  i: ["1", "l", "í", "ï", "ı", "ɩ", "і", "ⅰ", "ǐ"],
  k: ["κ", "ⱪ", "ķ", "қ"],
  l: ["1", "i", "ł", "ɫ", "ⅼ", "ǀ", "ן"],
  m: ["rn", "ṃ", "м", "ɱ"],
  n: ["ń", "ñ", "ņ", "ṇ", "и", "п"],
  o: ["0", "О", "о", "ο", "ө", "ọ", "ó", "ò", "ö", "õ", "ø"],
  p: ["ρ", "р", "ⲣ", "þ", "ṗ"],
  q: ["ɋ", "զ"],
  r: ["ʀ", "ɼ", "ř", "ṛ", "г"],
  s: ["ʂ", "ś", "š", "ѕ", "ṣ", "ș"],
  t: ["ţ", "ŧ", "ṭ", "ț", "т"],
  u: ["μ", "υ", "ц", "ù", "ú", "ü", "ũ", "ụ"],
  v: ["ѵ", "ν", "ṿ"],
  w: ["vv", "ѡ", "ԝ", "ẉ"],
  x: ["х", "ҳ", "ẋ"],
  y: ["γ", "у", "ý", "ÿ", "ŷ"],
  z: ["ʐ", "ż", "ź", "ẓ", "ᴢ"],
};

// reverse map: NON-ASCII confusable char -> ascii base. We deliberately skip
// ascii-letter glyphs (e.g. "l" listed under "i", "rn" under "m") so the skeleton
// never folds ascii->ascii — the ambiguous ascii groups are canonicalized below.
const SKELETON = new Map<string, string>();
for (const [asc, glyphs] of Object.entries(HOMOGLYPH)) {
  for (const g of glyphs) if ([...g].length === 1 && g.charCodeAt(0) > 127) SKELETON.set(g, asc);
}

const TLD_SWAP = [
  "com", "net", "org", "info", "biz", "co", "io", "app", "site", "online",
  "xyz", "top", "live", "vip", "cc", "me", "cn", "ru", "org.uk", "co.uk",
  "de", "fr", "eu", "us", "shop", "store", "pro", "tech", "email", "click",
];


export type DomainParts = { sld: string; tld: string };

export function splitDomain(domain: string): DomainParts | null {
  const d = domain.trim().toLowerCase().replace(/\.$/, "");
  const labels = d.split(".");
  if (labels.length < 2) return null;
  const last2 = labels.slice(-2).join(".");
  if (TWO_LABEL_SUFFIXES.has(last2) && labels.length >= 3) {
    return { sld: labels[labels.length - 3], tld: last2 };
  }
  return { sld: labels[labels.length - 2], tld: labels[labels.length - 1] };
}

// Fold a string to its ASCII "skeleton" so paypa1 / pаypal (cyrillic) / pαypal all
// collapse toward paypal for brand comparison.
export function confusableSkeleton(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase()) out += SKELETON.get(ch) ?? ch;
  // canonicalize the ascii look-alike groups so i/l/1/| and o/0 each unify
  return out.replace(/[il1|]/g, "l").replace(/0/g, "o");
}

function dedupe(list: string[], sld: string, tld: string): string[] {
  const self = `${sld}.${tld}`;
  return [...new Set(list)].filter((x) => x && x !== self && /^[a-z0-9¡-￿.-]+$/i.test(x));
}

// Generate the highest-signal typosquats of {sld}.{tld}. Bounded — we only keep
// the fuzzers that produce registerable, phishing-grade candidates.
export function generateLookalikes(domain: string, cap = 120): string[] {
  const parts = splitDomain(domain);
  if (!parts) return [];
  const { sld, tld } = parts;
  const out: string[] = [];
  const chars = [...sld];
  const emit = (s: string, t: string = tld) => { if (s.length >= 1) out.push(`${s}.${t}`); };

  // omission
  for (let i = 0; i < chars.length; i++) emit(chars.slice(0, i).concat(chars.slice(i + 1)).join(""));
  // transposition (swap adjacent)
  for (let i = 0; i < chars.length - 1; i++) {
    const c = [...chars]; [c[i], c[i + 1]] = [c[i + 1], c[i]]; emit(c.join(""));
  }
  // repetition (double a char)
  for (let i = 0; i < chars.length; i++) emit(chars.slice(0, i + 1).concat(chars.slice(i)).join(""));
  // replacement (qwerty-adjacent)
  for (let i = 0; i < chars.length; i++) {
    for (const r of QWERTY[chars[i]] ?? "") emit(chars.slice(0, i).concat(r, chars.slice(i + 1)).join(""));
  }
  // vowel swap
  for (let i = 0; i < chars.length; i++) {
    if (VOWELS.includes(chars[i])) for (const v of VOWELS) if (v !== chars[i]) emit(chars.slice(0, i).concat(v, chars.slice(i + 1)).join(""));
  }
  // homoglyph (single position)
  for (let i = 0; i < chars.length; i++) {
    for (const g of HOMOGLYPH[chars[i]] ?? []) emit(chars.slice(0, i).concat(g, chars.slice(i + 1)).join(""));
  }
  // hyphenation
  for (let i = 1; i < chars.length; i++) emit(chars.slice(0, i).concat("-", chars.slice(i)).join(""));
  // bitsquatting (flip one bit of an ascii letter)
  for (let i = 0; i < chars.length; i++) {
    const code = sld.charCodeAt(i);
    for (const mask of [1, 2, 4, 8, 16, 32, 64, 128]) {
      const b = code ^ mask;
      if ((b >= 97 && b <= 122) || (b >= 48 && b <= 57) || b === 45) {
        emit(chars.slice(0, i).concat(String.fromCharCode(b), chars.slice(i + 1)).join(""));
      }
    }
  }
  // tld swap (keep the sld, change the tld)
  for (const t of TLD_SWAP) if (t !== tld) emit(sld, t);
  // addition (append a letter)
  for (let c = 97; c <= 122; c++) emit(sld + String.fromCharCode(c));

  return dedupe(out, sld, tld).slice(0, cap);
}

// A small bundled list of brands phishers most often impersonate. The reader
// pastes a link; we flag it when it homoglyph/typo-collapses to one of these but
// lives on a DIFFERENT registrable domain (i.e. not the real thing).
const BRANDS: { sld: string; name: string; tld: string }[] = [
  ["google", "Google"], ["youtube", "YouTube"], ["gmail", "Gmail"], ["microsoft", "Microsoft"],
  ["outlook", "Outlook"], ["office365", "Microsoft 365"], ["apple", "Apple"], ["icloud", "iCloud"],
  ["amazon", "Amazon"], ["aws", "AWS"], ["facebook", "Facebook"], ["instagram", "Instagram"],
  ["whatsapp", "WhatsApp"], ["netflix", "Netflix"], ["paypal", "PayPal"], ["stripe", "Stripe"],
  ["binance", "Binance"], ["coinbase", "Coinbase"], ["metamask", "MetaMask"], ["kraken", "Kraken"],
  ["linkedin", "LinkedIn"], ["github", "GitHub"], ["dropbox", "Dropbox"], ["adobe", "Adobe"],
  ["dhl", "DHL"], ["fedex", "FedEx"], ["ups", "UPS"], ["usps", "USPS"], ["chase", "Chase"],
  ["wellsfargo", "Wells Fargo"], ["bankofamerica", "Bank of America"], ["hsbc", "HSBC"],
  ["citibank", "Citibank"], ["revolut", "Revolut"], ["wise", "Wise"], ["telegram", "Telegram"],
  ["steam", "Steam"], ["discord", "Discord"], ["twitter", "Twitter"], ["cloudflare", "Cloudflare"],
].map(([sld, name]) => ({ sld, name, tld: "com" }));

const BRAND_SKELETONS = new Map<string, { name: string; sld: string }>();
for (const b of BRANDS) BRAND_SKELETONS.set(confusableSkeleton(b.sld), { name: b.name, sld: b.sld });

function editDistance1(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

export type BrandHit = { brand: string; type: "homoglyph" | "typo"; realDomain: string } | null;

// Is `domain` a fake of a known brand (homoglyph or 1-edit typo) on a DIFFERENT
// registrable domain? Returns the impersonated brand, or null.
export function brandMatch(domain: string): BrandHit {
  const parts = splitDomain(domain);
  if (!parts) return null;
  const { sld } = parts;
  // exact skeleton match with a non-ascii or digit trick = homoglyph impersonation
  const skel = confusableSkeleton(sld);
  const exact = BRAND_SKELETONS.get(skel);
  if (exact && exact.sld !== sld) {
    return { brand: exact.name, type: "homoglyph", realDomain: `${exact.sld}.com` };
  }
  // 1-edit typo of a brand (paypall, gogle) — compare folded skeletons, both sides
  for (const b of BRANDS) {
    const bs = confusableSkeleton(b.sld);
    if (bs.length >= 5 && bs !== skel && editDistance1(skel, bs)) {
      return { brand: b.name, type: "typo", realDomain: `${b.sld}.com` };
    }
  }
  return null;
}
