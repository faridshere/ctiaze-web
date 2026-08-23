import { cache } from "react";
import { getDb } from "./db";

// Server-only. Reads the engine's `cve_intel` collection (~7.9k docs): grounded
// AZ/EN explainers written from ctiaze's own reporting on each CVE, plus the
// engine's closed-set triage `priority` (kev > exploited > high > standard —
// derived ONLY from the real KEV flag and wording in our own coverage), a CWE
// mapping and same-weakness related CVEs. This module only reads and reshapes;
// no field is ever synthesized here.

export type CvePriority = "kev" | "exploited" | "high" | "standard";

export type CveRelated = { cve: string; reason: string };

export type CveIntel = {
  id: string; // canonical uppercase CVE id (the collection _id)
  az: string;
  en: string;
  cwe: { id: string; name: string } | null;
  priority: CvePriority | null;
  related: CveRelated[]; // only CVEs that have their own explainer doc
};

// Accept any casing/whitespace ("cve-2021-44228") → canonical "CVE-2021-44228".
// Returns null for anything that is not a well-formed CVE id.
export function normalizeCveId(raw: string): string | null {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    // keep the raw value; the regex below rejects junk anyway
  }
  s = s.trim().toUpperCase();
  return /^CVE-\d{4}-\d{4,}$/.test(s) ? s : null;
}

type Doc = {
  _id: string;
  az?: string;
  en?: string;
  cwe?: { id?: string; name?: string } | null;
  priority?: string;
  related?: { cve?: string; reason?: string }[];
};

const PRIORITIES: readonly CvePriority[] = ["kev", "exploited", "high", "standard"];

// cache()-wrapped so generateMetadata + the page body share one Mongo read per
// request (same convention as getStoryBySlug / getActorById).
export const getCveIntel = cache(async (rawId: string): Promise<CveIntel | null> => {
  const id = normalizeCveId(rawId);
  if (!id) return null;
  const col = (await getDb()).collection<Doc>("cve_intel");
  const d = await col.findOne({ _id: id });
  if (!d || !((d.az ?? "").trim() || (d.en ?? "").trim())) return null;

  // Keep only related entries whose CVE has its own explainer doc, so the chips
  // never link into a 404 (one indexed $in probe on _id).
  const relRaw: CveRelated[] = [];
  for (const r of d.related ?? []) {
    const cve = normalizeCveId(r?.cve ?? "");
    if (cve && cve !== id) relRaw.push({ cve, reason: (r?.reason ?? "").trim() });
  }
  const related: CveRelated[] = [];
  if (relRaw.length) {
    const existing = await col
      .find({ _id: { $in: relRaw.map((r) => r.cve) } }, { projection: { _id: 1 } })
      .toArray();
    const ok = new Set(existing.map((x) => x._id));
    const seen = new Set<string>();
    for (const r of relRaw) {
      if (ok.has(r.cve) && !seen.has(r.cve)) {
        seen.add(r.cve);
        related.push(r);
      }
    }
  }

  const cweId = d.cwe?.id?.trim();
  const p = (d.priority ?? "").trim() as CvePriority;
  return {
    id: d._id,
    az: (d.az ?? "").trim(),
    en: (d.en ?? "").trim(),
    cwe: cweId ? { id: cweId, name: (d.cwe?.name ?? "").trim() } : null,
    priority: PRIORITIES.includes(p) ? p : null,
    related,
  };
});

// Build-time seed list for generateStaticParams: the engine's own triage order
// (kev > exploited > high > standard), newest CVE ids first within a tier.
export async function getTopCveIds(n = 100): Promise<string[]> {
  const col = (await getDb()).collection<Doc>("cve_intel");
  const rows = await col
    .aggregate<{ _id: string }>([
      { $project: { _id: 1, rank: { $indexOfArray: [[...PRIORITIES], "$priority"] } } },
      { $addFields: { rank: { $cond: [{ $eq: ["$rank", -1] }, PRIORITIES.length, "$rank"] } } },
      { $sort: { rank: 1, _id: -1 } },
      { $limit: n },
    ])
    .toArray();
  return rows.map((r) => r._id);
}

// Every explainer id, for the sitemap (~7.9k — far under the 50k sitemap cap).
export async function getAllCveIds(): Promise<string[]> {
  const col = (await getDb()).collection<Doc>("cve_intel");
  const rows = await col.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray();
  return rows.map((r) => r._id).filter((x) => typeof x === "string");
}

// Which of these CVEs have an explainer page — the /cve registry links only ids
// that resolve, never into a 404. One indexed $in query.
export async function cveIntelIdSet(cves: string[]): Promise<Set<string>> {
  const ids = [...new Set(cves.map(normalizeCveId).filter((x): x is string => x !== null))];
  if (!ids.length) return new Set();
  const col = (await getDb()).collection<Doc>("cve_intel");
  const rows = await col.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
  return new Set(rows.map((r) => r._id));
}
