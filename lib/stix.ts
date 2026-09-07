import { createHash } from "node:crypto";
import { absoluteUrl, SITE_NAME, SITE_URL } from "./site";
import { navigatorTactic } from "./navigator";
import type { ThreatActor } from "./threatactors";

// ---------------------------------------------------------------------------
// STIX 2.1 bundle for one dossier.
//
// STIX is the format every TIP, MISP instance and enrichment pipeline already
// ingests, so this is the version of a dossier a machine can act on: the group
// as an intrusion-set, its ATT&CK techniques as attack-patterns, its malware
// and tooling, and `uses` relationships joining them.
//
// Only the type-level import from ./threatactors is used: that module imports
// ./db, which throws at import time without MONGO_URI_READONLY, and this file
// must stay importable (and testable) without a database.
// ---------------------------------------------------------------------------

// The STIX namespace UUID (spec 2.1 §2.9). STIX only DEFINES deterministic
// UUIDv5 ids for cyber-observables and says SDO ids SHOULD be UUIDv4 — a
// SHOULD, not a MUST, and we deliberately deviate: a bundle whose object ids
// are freshly random on every request cannot be diffed, deduplicated on
// re-import, or referenced from anywhere. Same actor in, same ids out.
const STIX_NAMESPACE = "00abedb4-aa42-466c-9c01-fed23315a9b7";

function uuid5(name: string): string {
  const ns = Buffer.from(STIX_NAMESPACE.replace(/-/g, ""), "hex");
  const digest = createHash("sha1").update(ns).update(Buffer.from(name, "utf8")).digest();
  const b = Buffer.from(digest.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// The id-contributing string is the STIX type plus the single property that
// identifies the thing upstream — the ATT&CK id where there is one, the name
// otherwise. Keeping the type in the string stops a tool and a malware family
// that share a name from colliding into one id.
function stixId(type: string, key: string): string {
  return `${type}--${uuid5(`${type}:${key}`)}`;
}

export type StixExternalReference = {
  source_name: string;
  external_id?: string;
  url?: string;
  description?: string;
};

export type StixObject = {
  type: string;
  spec_version?: "2.1";
  id: string;
  created?: string;
  modified?: string;
  created_by_ref?: string;
  object_marking_refs?: string[];
  name?: string;
  description?: string;
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  resource_level?: string;
  external_references?: StixExternalReference[];
  kill_chain_phases?: { kill_chain_name: string; phase_name: string }[];
  is_family?: boolean;
  identity_class?: string;
  contact_information?: string;
  relationship_type?: string;
  source_ref?: string;
  target_ref?: string;
  definition_type?: string;
  definition?: { tlp: string };
};

export type StixBundle = {
  type: "bundle";
  id: string;
  objects: StixObject[];
};

// When skopnix started publishing STIX. Objects need a `created`, we do not
// record when a dossier row was first written, and stamping now() would churn
// every id-stable object's timestamp on every request — the exact thing this
// bundle exists to avoid. `modified` carries the real signal: the engine's
// last refresh of that actor.
const CREATED = "2026-09-07T00:00:00.000Z";

const IDENTITY_ID = stixId("identity", SITE_NAME);

// TLP:CLEAR as defined in STIX 2.1 §7.2.1.4 — fixed id, fixed created, and no
// `modified` property (marking-definitions do not have one). Shipped inside
// the bundle rather than referenced by id alone so the bundle stays valid on
// its own in a TIP that has not seen the predefined markings.
const TLP_CLEAR: StixObject = {
  type: "marking-definition",
  spec_version: "2.1",
  id: "marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9",
  created: "2022-10-01T00:00:00.000Z",
  definition_type: "tlp",
  name: "TLP:CLEAR",
  definition: { tlp: "clear" },
};

const MARKINGS = [TLP_CLEAR.id];

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

/** attack.mitre.org page for a technique id, sub-techniques included. */
export function attackTechniqueUrl(id: string): string {
  const [base, sub] = id.split(".");
  return `https://attack.mitre.org/techniques/${base}${sub ? `/${sub}` : ""}/`;
}

// Upstream ids are ATT&CK software ids (S0012) for anything ATT&CK knows and
// something else — a MISP uuid, or null — for anything it does not. Only the
// former gets an attack.mitre.org reference; a link built from a uuid would
// 404 and look like our mistake.
const ATTACK_SOFTWARE = /^S\d{4}$/;

function refSourceName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "reference";
  }
}

function actorExternalRefs(a: ThreatActor, dossier: string): StixExternalReference[] {
  const refs: StixExternalReference[] = [];
  if (a.mitre) {
    refs.push({
      source_name: "mitre-attack",
      external_id: a.mitre,
      url: `https://attack.mitre.org/groups/${a.mitre}/`,
    });
  }
  refs.push({ source_name: SITE_NAME, external_id: a._id, url: dossier });
  const seen = new Set(refs.map((r) => r.url));
  for (const url of a.refs ?? []) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    refs.push({ source_name: refSourceName(url), url });
  }
  return refs;
}

// The group's own name first (STIX SHOULD list it among the aliases), then the
// upstream aliases minus two kinds of noise: the ATT&CK group id, which is an
// identifier and already an external_reference, and case-only repeats — our
// upstream carries both "FANCY BEAR" and "Fancy Bear" for APT28.
function actorAliases(a: ThreatActor): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of [a.name, ...(a.aliases ?? [])]) {
    const v = (name ?? "").trim();
    if (!v || /^G\d{4}$/.test(v)) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** The bundle for one dossier. Deterministic: same actor in, same bytes out. */
export function stixBundle(a: ThreatActor): StixBundle {
  const dossier = absoluteUrl(`/actors/${a._id}`);
  // Our record's own age, not the moment of the request.
  const modified = iso(a.last_refreshed) ?? CREATED;
  const common = {
    spec_version: "2.1" as const,
    created: CREATED,
    modified,
    created_by_ref: IDENTITY_ID,
    object_marking_refs: MARKINGS,
  };

  const identity: StixObject = {
    type: "identity",
    spec_version: "2.1",
    id: IDENTITY_ID,
    created: CREATED,
    modified: CREATED,
    created_by_ref: IDENTITY_ID,
    object_marking_refs: MARKINGS,
    name: SITE_NAME,
    identity_class: "organization",
    description: `${SITE_NAME} — open threat intelligence. Aggregated and published, not authored: cite the external_references, not us.`,
    contact_information: SITE_URL,
  };

  const firstSeen = iso(a.first_seen);
  const lastSeen = iso(a.last_active);
  const intrusionSet: StixObject = {
    type: "intrusion-set",
    ...common,
    id: stixId("intrusion-set", a.mitre || a._id),
    name: a.name,
    aliases: actorAliases(a),
    ...(a.description_en ? { description: a.description_en } : {}),
    ...(firstSeen ? { first_seen: firstSeen } : {}),
    ...(lastSeen ? { last_seen: lastSeen } : {}),
    // Stated by the source, not inferred: a named state sponsor is what makes
    // this "government". Absent one we omit the field rather than downgrade
    // the group to "organization" on no evidence. `primary_motivation` is
    // omitted entirely — nothing in our record establishes motive.
    ...(a.state_sponsor ? { resource_level: "government" } : {}),
    external_references: actorExternalRefs(a, dossier),
  };

  const objects: StixObject[] = [TLP_CLEAR, identity, intrusionSet];
  const relationships: StixObject[] = [];

  const link = (target: StixObject) => {
    relationships.push({
      type: "relationship",
      ...common,
      id: stixId("relationship", `uses:${intrusionSet.id}:${target.id}`),
      relationship_type: "uses",
      source_ref: intrusionSet.id,
      target_ref: target.id,
    });
  };

  // One attack-pattern per technique id, carrying every tactic it was listed
  // under as a kill-chain phase. ATT&CK genuinely places some techniques in
  // two tactics, and emitting the object twice would be two objects claiming
  // the same id.
  const patterns = new Map<string, StixObject>();
  for (const t of a.techniques ?? []) {
    if (!t?.id) continue;
    const existing = patterns.get(t.id);
    const phase = navigatorTactic(t.tactic);
    if (existing) {
      if (phase && !existing.kill_chain_phases?.some((p) => p.phase_name === phase)) {
        existing.kill_chain_phases = [
          ...(existing.kill_chain_phases ?? []),
          { kill_chain_name: "mitre-attack", phase_name: phase },
        ];
      }
      continue;
    }
    patterns.set(t.id, {
      type: "attack-pattern",
      ...common,
      id: stixId("attack-pattern", t.id),
      name: t.name || t.id,
      external_references: [
        { source_name: "mitre-attack", external_id: t.id, url: attackTechniqueUrl(t.id) },
      ],
      // Omitted rather than guessed when the upstream tactic is not one we can
      // resolve — see navigatorTactic() on the ATT&CK v19 Defense Evasion split.
      ...(phase ? { kill_chain_phases: [{ kill_chain_name: "mitre-attack", phase_name: phase }] } : {}),
    });
  }
  for (const p of patterns.values()) {
    objects.push(p);
    link(p);
  }

  const software = (kind: "malware" | "tool", entries: { id: string | null; name: string }[]) => {
    const seen = new Set<string>();
    for (const s of entries) {
      const name = (s?.name ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const attackId = s.id && ATTACK_SOFTWARE.test(s.id) ? s.id : null;
      const obj: StixObject = {
        type: kind,
        ...common,
        id: stixId(kind, attackId || name),
        name,
        // is_family is REQUIRED on malware in 2.1. We hold families, never
        // individual samples — there is no hash or sample in a dossier.
        ...(kind === "malware" ? { is_family: true } : {}),
        ...(attackId
          ? {
              external_references: [
                {
                  source_name: "mitre-attack",
                  external_id: attackId,
                  url: `https://attack.mitre.org/software/${attackId}/`,
                },
              ],
            }
          : {}),
      };
      objects.push(obj);
      link(obj);
    }
  };
  software("malware", a.malware ?? []);
  software("tool", a.tools ?? []);

  objects.push(...relationships);

  return {
    type: "bundle",
    // Deterministic for the same reason every other id here is, and stable
    // across refreshes so a consumer can treat it as this actor's bundle.
    // Note there is no `spec_version` on a bundle: 2.1 removed it.
    id: `bundle--${uuid5(`bundle:${a._id}`)}`,
    objects,
  };
}
