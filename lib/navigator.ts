import { absoluteUrl } from "./site";
import { TACTICS } from "./attack";
import type { ThreatActor } from "./threatactors";

// ---------------------------------------------------------------------------
// MITRE ATT&CK Navigator layer, built from a dossier's techniques.
//
// A layer is the artefact a defender actually uses: they paste the URL into
// mitre-attack.github.io/attack-navigator and get the group's coverage over
// the matrix they already run their detections against. Emitting it costs us
// nothing — we already hold the technique list — and it is the difference
// between "a webpage about APT28" and "something I can diff against my own
// layer this afternoon".
//
// Only the type-level import from ./threatactors is used here: that module
// imports ./db, which throws at import time without MONGO_URI_READONLY, and
// this file must stay importable (and testable) without a database. The
// tactic list comes from ./attack rather than @/lib/attack for the same
// reason the rest of lib/ uses relative specifiers: the test runner's resolve
// hook (tests/ts-ext-loader.mjs) has no tsconfig path aliases.
// ---------------------------------------------------------------------------

// The 15 Enterprise tactic shortnames, verified against MITRE's own TAXII
// server (Enterprise ATT&CK collection, v19.2) rather than copied from memory.
// v19 retired Defense Evasion: TA0005 was renamed Stealth and the tampering
// half split off as Defense Impairment (TA0112), so a list written before
// April 2026 places two tactics' worth of techniques nowhere at all.
//
// It is re-exported from ./attack rather than declared twice, so the kill
// chain, the masthead's coverage count and this layer can never disagree about
// what a tactic is — they did until 2026-09-07, when the dossier folded two
// live tactics into one ATT&CK had retired.
export const NAVIGATOR_TACTICS: readonly string[] = TACTICS;

const TACTIC_SET = new Set<string>(NAVIGATOR_TACTICS);

/**
 * Our stored tactic as a Navigator tactic shorthand, or null when it is not
 * one we can vouch for.
 *
 * Navigator matches this string against ATT&CK's `x_mitre_shortname`, so
 * "Defense Impairment" or "credential access" silently annotates nothing —
 * the layer loads, looks fine, and is empty where it matters. We therefore
 * normalise to kebab-case and then CHECK the result against the real list
 * instead of trusting the shape.
 *
 * "defense-evasion" returns null on purpose. It was one tactic until ATT&CK
 * v19 and is now two, and nothing in our record says which half a given
 * technique landed in. Guessing would put techniques under a tactic MITRE
 * never assigned them; a technique with no `tactic` is annotated under every
 * tactic ATT&CK does place it in, which is the honest answer.
 */
export function navigatorTactic(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return TACTIC_SET.has(slug) ? slug : null;
}

export type NavigatorTechnique = {
  techniqueID: string;
  tactic?: string;
  score: number;
  comment: string;
  enabled: boolean;
};

export type NavigatorLayer = {
  name: string;
  versions: { attack: string; navigator: string; layer: string };
  domain: "enterprise-attack";
  description: string;
  sorting: number;
  layout: {
    layout: string;
    showID: boolean;
    showName: boolean;
    showAggregateScores: boolean;
    countUnscored: boolean;
    aggregateFunction: string;
    expandedSubtechniques: string;
  };
  hideDisabled: boolean;
  techniques: NavigatorTechnique[];
  gradient: { colors: string[]; minValue: number; maxValue: number };
  legendItems: { label: string; color: string }[];
  showTacticRowBackground: boolean;
  tacticRowBackground: string;
  selectTechniquesAcrossTactics: boolean;
  selectSubtechniquesWithParent: boolean;
  selectVisibleTechniques: boolean;
  metadata: { name: string; value: string }[];
  links: { label: string; url: string }[];
};

// Layer format 4.5 is the current spec (attack-navigator/layers/spec/v4.5).
// `attack` is the knowledge-base version our technique rows were pulled from:
// they already carry the v19 shortnames (stealth, defense-impairment), which
// is how we know the ETL is on the v19 line and not a v18 snapshot.
const LAYER_VERSION = "4.5";
const NAVIGATOR_VERSION = "5.2.0";
const ATTACK_VERSION = "19";

// Every technique scores the same, because we have nothing to grade them
// with. Our record per technique is id, name and tactic — no confidence, no
// observation count, no recency. A gradient built from that would be a
// picture of an opinion we do not hold, and a defender would read it as
// prioritisation. Flat 1 says "reported", full stop.
const FLAT_SCORE = 1;

// Signal orange (--brand) at the top of the range, dimmed at the bottom. With
// every score at 1 the whole layer renders in the brand colour; the gradient
// exists only because the format requires one.
const GRADIENT = { colors: ["#3d1b0d", "#ff5a1f"], minValue: 0, maxValue: 1 };

/**
 * The layer for one dossier. Returns null when the actor has no techniques —
 * see the route: an empty layer is worse than no layer, because it loads
 * cleanly and reads as "this group does nothing".
 */
export function navigatorLayer(a: ThreatActor): NavigatorLayer | null {
  const dossier = absoluteUrl(`/actors/${a._id}`);
  const attribution = a.mitre ? `MITRE ATT&CK ${a.mitre}` : "the sources cited on the dossier";

  // One annotation per (technique, tactic) pair. Navigator treats a repeated
  // pair as a duplicate cell, and our upstream can list the same technique
  // twice when ATT&CK places it under two tactics we both resolve to null.
  const seen = new Set<string>();
  const techniques: NavigatorTechnique[] = [];
  for (const t of a.techniques ?? []) {
    if (!t?.id) continue;
    const tactic = navigatorTactic(t.tactic);
    const key = `${t.id}|${tactic ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const unplaced =
      tactic === null && t.tactic
        ? ` Upstream tactic "${t.tactic}" is not an ATT&CK ${ATTACK_VERSION} Enterprise tactic, so this is annotated under every tactic the technique appears in rather than guessed into one.`
        : "";
    techniques.push({
      techniqueID: t.id,
      ...(tactic ? { tactic } : {}),
      score: FLAT_SCORE,
      comment: `${t.name || t.id} — reported for ${a.name} by ${attribution}.${unplaced}`,
      enabled: true,
    });
  }
  if (!techniques.length) return null;

  return {
    name: a.name,
    versions: { attack: ATTACK_VERSION, navigator: NAVIGATOR_VERSION, layer: LAYER_VERSION },
    domain: "enterprise-attack",
    description:
      `${a.name}: ${techniques.length} ATT&CK Enterprise techniques as reported by ${attribution}, ` +
      `published by skopnix from the dossier at ${dossier}. ` +
      `Every technique scores ${FLAT_SCORE}: this is a coverage map, not a ranking — we hold no ` +
      `per-technique confidence or frequency, so a graded heatmap would be invented. ` +
      `Nothing here is skopnix's own attribution; cite the sources listed on the dossier.`,
    sorting: 0,
    layout: {
      layout: "side",
      showID: true,
      showName: true,
      showAggregateScores: false,
      countUnscored: false,
      aggregateFunction: "average",
      // Most of what a group is credited with is sub-techniques. Left at
      // "none" they are annotated but collapsed, so the layer opens looking
      // far emptier than it is.
      expandedSubtechniques: "annotated",
    },
    hideDisabled: false,
    techniques,
    gradient: GRADIENT,
    legendItems: [{ label: `Reported for ${a.name}`, color: GRADIENT.colors[GRADIENT.colors.length - 1] }],
    showTacticRowBackground: false,
    tacticRowBackground: "#dddddd",
    selectTechniquesAcrossTactics: true,
    selectSubtechniquesWithParent: false,
    selectVisibleTechniques: false,
    // No `filters.platforms`: we do not record which platforms a group was
    // seen on, and a guessed filter would hide real cells in Navigator.
    metadata: [
      { name: "source", value: "skopnix" },
      { name: "actor_id", value: a._id },
      ...(a.mitre ? [{ name: "attack_group", value: a.mitre }] : []),
      { name: "techniques", value: String(techniques.length) },
    ],
    links: [{ label: `${a.name} dossier on skopnix`, url: dossier }],
  };
}
