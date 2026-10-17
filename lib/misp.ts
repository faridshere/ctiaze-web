import { absoluteUrl, SITE_NAME } from "./site";
import { uuid5 } from "./stix";
import {
  citedAt,
  normalizeCve,
  normalizeIoc,
  sourceUrl,
  type CveCitation,
  type IocCitation,
  type NormalizedIoc,
} from "./cited";
import type { ThreatActor } from "./threatactors";

// ---------------------------------------------------------------------------
// A MISP feed of the cited intelligence: one event per actor, holding its
// cited indicators and CVEs, each attribute's comment the quoted sentence and
// the report it came from. MISP reads <feed>/manifest.json, then fetches
// <feed>/<event uuid>.json for every event whose timestamp moved.
//
// Pure: the routes in app/api/v1/misp feed it rows. Same rules as the STIX
// side (lib/cited.ts): a row without a usable source URL, or an indicator that
// is not what its type says, is dropped.
// ---------------------------------------------------------------------------

export const MISP_ORG = { name: SITE_NAME, uuid: uuid5(`misp-org:${SITE_NAME}`) };

// One event is one response; MISP feeds cannot page an event, so it is
// capped. Newest citations win.
export const MAX_ATTRIBUTES = 1000;
// A value cited by many reports keeps the first few quotes in its comment.
const MAX_QUOTES_PER_ATTRIBUTE = 3;
const MAX_COMMENT = 4000;

const TAGS = [
  { name: "tlp:white", colour: "#ffffff", exportable: true },
  { name: "skopnix:cited", colour: "#1f2937", exportable: true },
];

export type MispAttribute = {
  uuid: string;
  type: string;
  category: string;
  value: string;
  to_ids: boolean;
  comment: string;
  timestamp: string;
  distribution: "5";
  disable_correlation: boolean;
};

export type MispEvent = {
  Event: {
    uuid: string;
    info: string;
    date: string;
    threat_level_id: "4";
    analysis: "1";
    published: true;
    timestamp: string;
    publish_timestamp: string;
    Orgc: typeof MISP_ORG;
    Tag: typeof TAGS;
    Attribute: MispAttribute[];
  };
};

export type ManifestEntry = {
  Orgc: typeof MISP_ORG;
  Tag: typeof TAGS;
  info: string;
  date: string;
  analysis: "1";
  threat_level_id: "4";
  timestamp: string;
};

export function mispEventUuid(actorId: string): string {
  return uuid5(`misp-event:${actorId}`);
}

const eventInfo = (a: Pick<ThreatActor, "name">) => `${SITE_NAME} cited intelligence: ${a.name}`;
const unix = (isoTs: string) => String(Math.floor(Date.parse(isoTs) / 1000));
const day = (isoTs: string) => isoTs.slice(0, 10);

/**
 * MISP type, category and to_ids for one indicator. to_ids (export to IDS) is
 * off for filenames: a bare name like "update.exe" matches too much benign
 * software to block on.
 */
function mispTypeOf(ioc: NormalizedIoc): { type: string; category: string; to_ids: boolean } {
  switch (ioc.kind) {
    case "sha256":
    case "sha1":
    case "md5":
      return { type: ioc.kind, category: "Payload delivery", to_ids: true };
    case "filename":
      return { type: "filename", category: "Payload delivery", to_ids: false };
    case "ipv4":
    case "ipv6":
      return { type: "ip-dst", category: "Network activity", to_ids: true };
    case "domain":
      return { type: "domain", category: "Network activity", to_ids: true };
    case "url":
      return { type: "url", category: "Network activity", to_ids: true };
    case "email":
      return { type: "email-src", category: "Payload delivery", to_ids: true };
  }
}

type Draft = {
  type: string;
  category: string;
  value: string;
  to_ids: boolean;
  at: string;
  cites: { quote: string; url: string }[];
};

function citeLine(c: { quote: string; url: string }): string {
  return c.quote ? `"${c.quote}" — ${c.url}` : c.url;
}

/**
 * The event for one actor. Attributes are deduplicated on (type, value) —
 * MISP refuses the same value twice in one event — with up to three citing
 * quotes in the comment. Deterministic: same rows in, same bytes out.
 *
 * `stamp` is the instant manifest.json lists for this event. Pass it: MISP
 * re-fetches an event whenever the manifest's timestamp is newer than the one
 * it holds, so the two must be equal by construction, not by coincidence —
 * the newest cited row can be one this function drops (a malformed indicator).
 * Without it the event is stamped with its newest attribute.
 */
export function mispEvent(
  actor: Pick<ThreatActor, "_id" | "name">,
  cves: CveCitation[],
  iocs: IocCitation[],
  stamp?: string,
): MispEvent {
  const drafts = new Map<string, Draft>();
  const add = (d: Omit<Draft, "cites">, quote: string | null | undefined, url: string) => {
    const key = `${d.type}\u0000${d.value}`;
    const q = (quote ?? "").replace(/\s+/g, " ").trim();
    const prev = drafts.get(key);
    if (!prev) {
      drafts.set(key, { ...d, cites: [{ quote: q, url }] });
      return;
    }
    if (d.at > prev.at) prev.at = d.at;
    if (!prev.cites.some((c) => c.url === url)) prev.cites.push({ quote: q, url });
  };

  for (const r of iocs) {
    if (r.actor_id !== actor._id) continue;
    const ioc = normalizeIoc(r.type, r.value);
    const url = sourceUrl(r.url);
    if (!ioc || !url) continue;
    add({ ...mispTypeOf(ioc), value: ioc.value, at: citedAt(r) }, r.quote, url);
  }
  for (const r of cves) {
    if (r.actor_id !== actor._id) continue;
    const cve = normalizeCve(r.cve);
    const url = sourceUrl(r.url);
    if (!cve || !url) continue;
    // A CVE is context, not something an IDS can match.
    add({ type: "vulnerability", category: "External analysis", value: cve, to_ids: false, at: citedAt(r) }, r.quote, url);
  }

  // Newest first, then a stable tie-break, so the cap keeps the freshest and
  // the order never depends on the order rows came back from the database.
  const ordered = [...drafts.values()].sort(
    (a, b) => (a.at !== b.at ? (a.at < b.at ? 1 : -1) : `${a.type}${a.value}` < `${b.type}${b.value}` ? -1 : 1),
  );
  const kept = ordered.slice(0, MAX_ATTRIBUTES);
  const attributes: MispAttribute[] = kept.map((d) => {
    const cites = [...d.cites].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
    let comment = cites.slice(0, MAX_QUOTES_PER_ATTRIBUTE).map(citeLine).join(" | ");
    if (cites.length > MAX_QUOTES_PER_ATTRIBUTE) comment += ` | +${cites.length - MAX_QUOTES_PER_ATTRIBUTE} more sources`;
    if (comment.length > MAX_COMMENT) comment = `${comment.slice(0, MAX_COMMENT - 1)}…`;
    return {
      uuid: uuid5(`misp-attribute:${actor._id}:${d.type}:${d.value}`),
      type: d.type,
      category: d.category,
      value: d.value,
      to_ids: d.to_ids,
      comment,
      timestamp: unix(d.at),
      distribution: "5",
      disable_correlation: false,
    };
  });

  // The dossier link and the actor's name, so an analyst landing on the event
  // in MISP can get back to the record it came from.
  const eventStamp = stamp ?? kept[0]?.at ?? "2026-09-07T00:00:00.000Z";
  attributes.push(
    {
      uuid: uuid5(`misp-attribute:${actor._id}:threat-actor`),
      type: "threat-actor",
      category: "Attribution",
      value: actor.name,
      to_ids: false,
      comment: `${SITE_NAME} dossier id ${actor._id}`,
      timestamp: unix(eventStamp),
      distribution: "5",
      disable_correlation: false,
    },
    {
      uuid: uuid5(`misp-attribute:${actor._id}:dossier`),
      type: "link",
      category: "External analysis",
      value: absoluteUrl(`/actors/${actor._id}`),
      to_ids: false,
      comment: `${SITE_NAME} dossier`,
      timestamp: unix(eventStamp),
      distribution: "5",
      disable_correlation: true,
    },
  );

  return {
    Event: {
      uuid: mispEventUuid(actor._id),
      info: eventInfo(actor),
      date: day(eventStamp),
      threat_level_id: "4",
      analysis: "1",
      published: true,
      timestamp: unix(eventStamp),
      publish_timestamp: unix(eventStamp),
      Orgc: MISP_ORG,
      Tag: TAGS,
      Attribute: attributes,
    },
  };
}

/**
 * One manifest row. `latest` must be the instant mispEvent() is stamped
 * with (its `stamp`), or MISP re-fetches the event on every pull.
 */
export function manifestEntry(actor: Pick<ThreatActor, "name">, latest: string): ManifestEntry {
  return {
    Orgc: MISP_ORG,
    Tag: TAGS,
    info: eventInfo(actor),
    date: day(latest),
    analysis: "1",
    threat_level_id: "4",
    timestamp: unix(latest),
  };
}
