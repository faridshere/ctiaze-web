// ---------------------------------------------------------------------------
// Actor aliases that upstream keeps as SEPARATE entries but the community has
// merged into one group. Publishing both is not a cosmetic duplicate: the two
// pages carried contradictory metadata (APT29 read "attribution confidence
// 50/100, Nation-state"; UNC2452 read "100/100, Unknown" — the less-attributed
// alias claiming double the confidence), listed the same five dispatches, and
// double-counted them in the index.
//
// MITRE merged UNC2452 / NOBELIUM / Dark Halo into APT29 (G0016) in ATT&CK v10,
// October 2021. skopnix's own APT29 page already cites G0016, so keeping UNC2452
// as a peer contradicts the source we cite.
//
// Deliberately CONSERVATIVE: only merges that the cited source itself has made.
// Inventing an attribution merge would be a worse error than the duplicate — if
// you are not certain, leave it out.
// ---------------------------------------------------------------------------
export const ACTOR_ALIAS_CANONICAL: Record<string, string> = {
  unc2452: "apt29",
  nobelium: "apt29",
  "midnight-blizzard": "apt29",
  "dark-halo": "apt29",
  darkhalo: "apt29",
};

/** The id this actor should be published under, or the id itself. */
export function canonicalActorId(id: string): string {
  return ACTOR_ALIAS_CANONICAL[id.toLowerCase()] ?? id;
}

/** True when this id is an alias of another actor and must not be indexed. */
export function isAliasActorId(id: string): boolean {
  return id.toLowerCase() in ACTOR_ALIAS_CANONICAL;
}
