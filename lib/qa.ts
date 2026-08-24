import { cache } from "react";
import { getDb } from "./db";
import { normalizeCveId } from "./cveintel-page";

// Server-only. Reads the engine's `qa` collection (~16.8k grounded, bilingual
// az/en question–answer pairs) keyed to a subject: subject_type "cve" whose
// subject_id is a cve_intel._id (an uppercase CVE id), or "actor" whose
// subject_id is a threat_actors._id (a lowercase slug). Each doc carries
// q_az/q_en + a_az/a_en. This module only reads and reshapes to the requested
// locale — no field is ever synthesized here.

export type Qa = { q: string; a: string };

type QaDoc = {
  _id: string;
  subject_type?: string;
  subject_id?: string;
  q_az?: string | null;
  q_en?: string | null;
  a_az?: string | null;
  a_en?: string | null;
};

// Subjects carry only 1–2 pairs today; cap defensively so a page never renders a
// runaway FAQ (and Google never sees an abusive FAQPage block).
const MAX_PAIRS = 6;

// Resolve one doc to the reader's locale with the same az⇄en fallback used across
// the product, then keep it only if BOTH a question and an answer survive — this
// is where empty answers get dropped.
function resolve(d: QaDoc, en: boolean): Qa | null {
  const q = ((en ? d.q_en || d.q_az : d.q_az || d.q_en) || "").trim();
  const a = ((en ? d.a_en || d.a_az : d.a_az || d.a_en) || "").trim();
  return q && a ? { q, a } : null;
}

async function fetchQa(
  subjectType: "cve" | "actor",
  subjectId: string,
  en: boolean,
): Promise<Qa[]> {
  const col = (await getDb()).collection<QaDoc>("qa");
  // Sort by _id so the engine's authored order (…#0, …#1) is stable across reads.
  const docs = await col
    .find({ subject_type: subjectType, subject_id: subjectId })
    .sort({ _id: 1 })
    .limit(MAX_PAIRS)
    .toArray();
  const out: Qa[] = [];
  for (const d of docs) {
    const qa = resolve(d, en);
    if (qa) out.push(qa);
  }
  return out;
}

// cache()-wrapped so a page reading QA in its body pays one Mongo round-trip per
// request (same convention as getCveIntel / getActorById). Ids are normalized the
// way their sibling libs do: CVE ids are canonicalized to uppercase; actor slugs
// (matched exactly by getActorById) are only trimmed.
export const getQaForCve = cache(
  async (rawId: string, en: boolean): Promise<Qa[]> => {
    const id = normalizeCveId(rawId);
    if (!id) return [];
    return fetchQa("cve", id, en);
  },
);

export const getQaForActor = cache(
  async (rawId: string, en: boolean): Promise<Qa[]> => {
    const id = (rawId || "").trim();
    if (!id) return [];
    return fetchQa("actor", id, en);
  },
);
