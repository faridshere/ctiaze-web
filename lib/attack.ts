// The ATT&CK Enterprise tactics, in kill-chain order.
//
// VERIFIED 2026-09-07 against MITRE's own STIX bundle
// (mitre-attack/attack-stix-data, enterprise-attack-19.2.json): fifteen live
// tactics, and Defense Evasion is NOT among them. ATT&CK v19 retired TA0005
// "Defense Evasion", renaming it Stealth and splitting the tampering half into
// Defense Impairment (TA0112).
//
// This file previously listed "the classic fourteen" including defense-evasion
// and folded `stealth` and `defense-impairment` INTO it. Our own roster carries
// 689 stealth techniques, 141 defense-impairment and zero defense-evasion, so
// every dossier was collapsing two current tactics into one retired column and
// counting coverage against a list one short. Do not re-add defense-evasion:
// if it ever appears in stored data it is pre-v19 and there is nothing in our
// record saying which half a technique landed in, so it stays unplaced rather
// than guessed into one.
export const TACTICS = [
  "reconnaissance",
  "resource-development",
  "initial-access",
  "execution",
  "persistence",
  "privilege-escalation",
  "stealth",
  "defense-impairment",
  "credential-access",
  "discovery",
  "lateral-movement",
  "collection",
  "command-and-control",
  "exfiltration",
  "impact",
] as const;

export const TACTIC_COUNT = TACTICS.length; // 15

const TACTIC_SET = new Set<string>(TACTICS);

/** Kebab-case a stored tactic. Does NOT map unknown names onto known ones. */
export function normTactic(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** True when the normalised name is a live ATT&CK Enterprise tactic. */
export function isTactic(s: string | null | undefined): boolean {
  return TACTIC_SET.has(normTactic(s));
}

/** How many distinct live tactics this technique set covers. */
export function tacticCount(techniques: { tactic?: string | null }[]): number {
  return new Set(techniques.map((t) => normTactic(t.tactic)).filter((t) => TACTIC_SET.has(t))).size;
}
