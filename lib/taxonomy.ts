// The ONE threat-category taxonomy, used everywhere the category appears (Spektr
// bar + legend, ledger rows, story detail, /cve, /ioc). Each ai_category maps to
// a 2-letter Azerbaijani glyph code, its full Azerbaijani name, and a --cat-*
// color token. This is the honest reincarnation of Ground News's bias dimension:
// category is the one rich field present on 100/100 stories.

export type Category =
  | "vuln"
  | "exploit"
  | "malware"
  | "ransomware"
  | "apt"
  | "breach"
  | "research"
  | "supply-chain"
  | "policy"
  | "other";

// Canonical spectrum order — used to break count ties so the bar and the legend
// always agree, and so a category holds the same slot site-wide.
export const CATEGORY_ORDER: Category[] = [
  "vuln",
  "exploit",
  "malware",
  "ransomware",
  "apt",
  "breach",
  "research",
  "supply-chain",
  "policy",
  "other",
];

export const CATEGORY_META: Record<Category, { glyph: string; name: string; token: string }> = {
  vuln: { glyph: "ZF", name: "zəiflik", token: "--cat-vuln" },
  exploit: { glyph: "EK", name: "eksploit", token: "--cat-exploit" },
  malware: { glyph: "ZP", name: "zərərli proqram", token: "--cat-malware" },
  ransomware: { glyph: "FP", name: "fidyə proqramı", token: "--cat-ransomware" },
  apt: { glyph: "APT", name: "APT / dövlət", token: "--cat-apt" },
  breach: { glyph: "SZ", name: "sızma", token: "--cat-breach" },
  research: { glyph: "TQ", name: "tədqiqat", token: "--cat-research" },
  "supply-chain": { glyph: "TZ", name: "təchizat zənciri", token: "--cat-supply-chain" },
  policy: { glyph: "SI", name: "siyasət", token: "--cat-policy" },
  other: { glyph: "DG", name: "digər", token: "--cat-other" },
};

export function normalizeCategory(raw: string | undefined | null): Category {
  const c = (raw || "").toLowerCase().trim();
  return (c in CATEGORY_META ? c : "other") as Category;
}

// A CSS value for the category color — used inline because the category is a
// runtime string (Tailwind can't generate a class from a dynamic value).
export function catColor(cat: Category): string {
  return `var(${CATEGORY_META[cat].token})`;
}

export function categoryName(raw: string | undefined | null): string {
  return CATEGORY_META[normalizeCategory(raw)].name;
}
