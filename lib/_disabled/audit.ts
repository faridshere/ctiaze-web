import { cache } from "react";
import { getDb } from "../db";

// Server-only. Reads the engine's `content_audit` collection — an independent,
// automated groundedness audit over skopnix's AI-written knowledge-base explainers.
// Each document is one audit verdict for one explainer:
//   _id:       "<type>:<id>"                    (e.g. "actor:apt1", "malware:…")
//   type:      "actor" | "malware" | "guide"
//   supported: boolean  — did every statement stay within its cited source?
//   issues:    { claim, why_unsupported }[]     — the exact statements that
//              reached beyond the source (empty [] when supported)
//   model:     the auditor — DELIBERATELY NOT surfaced; the methodology page
//              names no providers or models, only method and user value.
//
// HONESTY NOTE (load-bearing — this feeds a TRUST page):
// content_audit is a RECORD, not a publish gate. Flagged statements remain in the
// live text (verified by cross-referencing threat_actors.intel / malware_intel.az —
// the flagged claims are still present). So this module reports ONLY what the data
// provably shows: how much of the knowledge base was audited, and how many
// statements the audit flagged as reaching beyond their source. It never asserts
// that anything is "removed", nor a "% verified" accuracy score — the collection
// does not support either claim.

const LIVE_COLLECTION: Record<string, string> = {
  actor: "threat_actors",
  malware: "malware_intel",
  guide: "concept_guides",
};

export type AuditTypeStat = {
  type: string;   // "actor" | "malware" | "guide"
  audited: number;
  flagged: number;
};

export type AuditSummary = {
  audited: number;            // explainers put through the audit
  cleanDocs: number;          // fully within source (issues == [])
  flaggedDocs: number;        // ≥1 statement that reached beyond source
  flaggedClaims: number;      // individual beyond-source statements, all logged
  byType: AuditTypeStat[];    // per content type, most-audited first
  coveragePct: number | null; // audited ÷ live knowledge-base entries; null if unknown
};

// cache()-wrapped so generateMetadata + the page body share one round trip per
// request (same convention as lib/qa.ts). The page itself is ISR (revalidate 1d),
// so this runs at most once per regeneration.
export const getAuditSummary = cache(async (): Promise<AuditSummary | null> => {
  try {
    const db = await getDb();
    const col = db.collection("content_audit");

    const audited = await col.countDocuments({});
    if (!audited) return null; // thin / absent data → page renders an honest shell

    const [flaggedDocs, byTypeAgg, claimAgg] = await Promise.all([
      col.countDocuments({ supported: false }),
      col
        .aggregate<{ _id: string; audited: number; flagged: number }>([
          {
            $group: {
              _id: "$type",
              audited: { $sum: 1 },
              flagged: { $sum: { $cond: [{ $eq: ["$supported", false] }, 1, 0] } },
            },
          },
          { $sort: { audited: -1 } },
        ])
        .toArray(),
      col
        .aggregate<{ total: number }>([
          { $match: { supported: false } },
          {
            $group: {
              _id: null,
              total: { $sum: { $size: { $ifNull: ["$issues", []] } } },
            },
          },
        ])
        .toArray(),
    ]);

    const byType: AuditTypeStat[] = byTypeAgg.map((t) => ({
      type: t._id,
      audited: t.audited,
      flagged: t.flagged,
    }));

    // Coverage = audited ÷ live entries of the audited types. Computed live so it
    // stays honest as the corpus grows: an audit that lags new content shows LOWER
    // coverage, never an inflated one. If any live count is unavailable the figure
    // is withheld (null) rather than guessed.
    const liveCounts = await Promise.all(
      byType.map(async (t) => {
        const name = LIVE_COLLECTION[t.type];
        if (!name) return null;
        try {
          return await db.collection(name).countDocuments({});
        } catch {
          return null;
        }
      }),
    );
    const liveOk = liveCounts.every((c) => c !== null);
    const liveTotal = liveCounts.reduce<number>((s, c) => s + (c ?? 0), 0);
    const coveragePct =
      liveOk && liveTotal > 0
        ? Math.min(100, Math.round((audited / liveTotal) * 100))
        : null;

    return {
      audited,
      cleanDocs: audited - flaggedDocs,
      flaggedDocs,
      flaggedClaims: claimAgg[0]?.total ?? 0,
      byType,
      coveragePct,
    };
  } catch {
    return null; // DB unreachable → honest shell, never fabricated numbers
  }
});
