// ---------------------------------------------------------------------------
// Pure shaping for the /claims board: which stored `hacktivist_posts` rows are
// public, which region they belong to, and which are noise. No database
// imports, so tests/claims-shape.test.ts runs it offline.
//
// Regions (written by the engine's hacktivist watch):
//   • region "az"      — claims against Azerbaijan;
//   • region "global"  — claims against targets anywhere else;
//   • no region field  — legacy rows from before the split; they were all
//                        Azerbaijan rows (az: true), and stay so.
//
// Noise never renders, in either region:
//   • rows the engine flagged noise: true;
//   • rows whose stored classification says they are not a claim: the summary
//     model filed them as claim_type "other" and its own summary says there is
//     no cyber/hacktivist activity in them ("Not a hacktivist or
//     cybersecurity-related post", "claims no cyberattack", ...);
//   • motorsport: the Azerbaijan Grand Prix trips the AZ keyword match every
//     season, and FIA "document" accounts read like leaks to the model. A real
//     DDoS or defacement of a race site, and any leak-site listing, keeps its row.
// The same rules are expressed twice, once as a Mongo filter (so counts and
// the ledger agree) and once as a JS predicate (for tests); both are built from
// the constants below so they cannot drift.
// ---------------------------------------------------------------------------

export type ClaimRegion = "az" | "global";
export type RegionParam = ClaimRegion | "all";

export const REGIONS: readonly ClaimRegion[] = ["az", "global"];

/** The ?region= value of /api/v1/claims; anything unknown is "all". */
export function parseRegion(v: string | null | undefined): RegionParam {
  return v === "az" || v === "global" ? v : "all";
}

/** Kinds the public board may show; dark-web hits stay private. */
export const PUBLIC_KINDS_CLAUSE = {
  $or: [
    { kind: { $in: ["telegram", "bluesky"] }, claim_like: true },
    { kind: "ransomware" },
  ],
};

const REGION_CLAUSE: Record<ClaimRegion, Record<string, unknown>> = {
  // `region: null` matches a missing field too: legacy rows, AZ by az: true.
  az: { $or: [{ region: "az" }, { region: null, az: true }] },
  global: { region: "global" },
};

// claim_type values the engine may store when the model says "not a claim".
export const NOT_A_CLAIM_TYPES = ["none", "not_a_claim", "noise"];
// Attack types that keep a row even when it mentions motorsport.
export const ATTACK_TYPES = ["ddos", "defacement", "intrusion", "ransomware"];
// The summary model's own "this is not a cyber/hacktivist claim" phrasing.
export const NOT_CYBER_SRC = String.raw`\b(no|not)\b[^.]{0,40}?(cyber|hack)|rather than an? (hacktivist|cyber)`;
export const MOTORSPORT_SRC = String.raw`formula ?(1|one)\b|grand prix|\bF1\b|\bFIA\b`;

const NOT_CYBER_RE = new RegExp(NOT_CYBER_SRC, "i");
const MOTORSPORT_RE = new RegExp(MOTORSPORT_SRC, "i");

/** Mongo clause that removes noise rows; used with $nor. */
export const NOISE_CLAUSES: Record<string, unknown>[] = [
  { noise: true },
  { "summary.claim_type": { $in: NOT_A_CLAIM_TYPES } },
  { "summary.claim_type": "other", "summary.summary_en": { $regex: NOT_CYBER_SRC, $options: "i" } },
  {
    kind: { $ne: "ransomware" },
    "summary.claim_type": { $nin: ATTACK_TYPES },
    $or: [
      { "summary.summary_en": { $regex: MOTORSPORT_SRC, $options: "i" } },
      { text: { $regex: MOTORSPORT_SRC, $options: "i" } },
    ],
  },
];

/** The public, noise-free filter for one region, or both. */
export function claimsFilter(region: RegionParam): Record<string, unknown> {
  const where = region === "all" ? { $or: REGIONS.map((r) => REGION_CLAUSE[r]) } : REGION_CLAUSE[region];
  return { $and: [where, PUBLIC_KINDS_CLAUSE, { $nor: NOISE_CLAUSES }] };
}

/** The fields the noise and region rules read. */
export type ShapeDoc = {
  kind?: string;
  az?: boolean;
  region?: string | null;
  noise?: boolean;
  claim_like?: boolean;
  text?: string;
  summary?: { claim_type?: string; summary_en?: string } | null;
};

/** JS mirror of NOISE_CLAUSES. */
export function isNoise(d: ShapeDoc): boolean {
  if (d.noise === true) return true;
  const type = d.summary?.claim_type;
  const summary = d.summary?.summary_en ?? "";
  if (type && NOT_A_CLAIM_TYPES.includes(type)) return true;
  if (type === "other" && NOT_CYBER_RE.test(summary)) return true;
  if (
    d.kind !== "ransomware" &&
    !(type && ATTACK_TYPES.includes(type)) &&
    (MOTORSPORT_RE.test(summary) || MOTORSPORT_RE.test(d.text ?? ""))
  ) {
    return true;
  }
  return false;
}

/** Which region a stored row belongs to, or null when it is in neither. */
export function regionOf(d: ShapeDoc): ClaimRegion | null {
  if (d.region === "az" || d.region === "global") return d.region;
  if (d.region == null && d.az === true) return "az";
  return null;
}

/** JS mirror of claimsFilter(region). */
export function isPublicClaim(d: ShapeDoc, region: RegionParam): boolean {
  const r = regionOf(d);
  if (r === null || (region !== "all" && r !== region)) return false;
  const kindOk = ((d.kind === "telegram" || d.kind === "bluesky") && d.claim_like === true) || d.kind === "ransomware";
  return kindOk && !isNoise(d);
}
