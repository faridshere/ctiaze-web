// The classic fourteen ATT&CK enterprise tactics, and the fold the engine's
// newer tactic names take to land in them. Shared by the dossier masthead and
// the kill chain so the two never disagree about "N of 14 tactics" again.
export const TACTICS = [
  "reconnaissance", "resource-development", "initial-access", "execution", "persistence",
  "privilege-escalation", "defense-evasion", "credential-access", "discovery",
  "lateral-movement", "collection", "command-and-control", "exfiltration", "impact",
] as const;
const TACTIC_SET = new Set<string>(TACTICS);
const FOLD: Record<string, string> = { stealth: "defense-evasion", "defense-impairment": "defense-evasion" };

export function normTactic(s: string | null | undefined): string {
  const k = (s ?? "").toLowerCase().replace(/[_\s]+/g, "-").trim();
  return FOLD[k] ?? k;
}

export function tacticCount(techniques: { tactic?: string | null }[]): number {
  return new Set(techniques.map((t) => normTactic(t.tactic)).filter((t) => TACTIC_SET.has(t))).size;
}
