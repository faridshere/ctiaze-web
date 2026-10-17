import { unstable_cache } from "next/cache";
import { getDb } from "./db";
import { PUBLIC_FILTER, toRow, type ClaimDoc } from "./claims";
import { getTrendingBoardCached } from "./exploits";
import { PUBLISHED_FILTER } from "./stories";
import { getActorNamesFor } from "./threatactors";
import { withSnapshot } from "./snapshot";
import {
  groupCampaigns,
  selectAzExploits,
  shapeAdversaries,
  shapeExposure,
  type AdversaryDoc,
  type AzBoard,
  type AzExposureHit,
  type ExposureDoc,
  type Section,
} from "./az-shape";

// ---------------------------------------------------------------------------
// The Azerbaijan threat dashboard: the read half. The engine writes
// hacktivist_posts, az_adversaries, az_exposure, iocs and the exploit board;
// this site reads them through the read-only user in lib/db.ts. Each section
// is one or two queries, read independently: a collection that is missing or
// unreachable marks its own section unavailable instead of blanking the page.
// ---------------------------------------------------------------------------

const WEEK_MS = 7 * 86_400_000;
const DARK = ["darkweb", "dark_web", "ahmia", "onion", "tor"];

async function settle<T>(name: string, p: Promise<T>, empty: T): Promise<Section<T>> {
  try {
    return { ok: true, rows: await p };
  } catch (err) {
    console.error(`[az] ${name} unavailable:`, err);
    return { ok: false, rows: empty };
  }
}

async function readClaims(): Promise<ClaimDoc[]> {
  const db = await getDb();
  const since = new Date(Date.now() - WEEK_MS);
  return db
    .collection<ClaimDoc>("hacktivist_posts")
    .aggregate<ClaimDoc>([
      { $match: { ...PUBLIC_FILTER, $expr: { $gte: [{ $ifNull: ["$published", "$first_seen"] }, since] } } },
      { $sort: { first_seen: -1 } },
      { $limit: 500 },
      { $project: { az_why: 0, tier: 0 } },
    ])
    .toArray();
}

async function readAdversaries(): Promise<AdversaryDoc[]> {
  const db = await getDb();
  return db
    .collection<AdversaryDoc>("az_adversaries")
    .find({ kind: { $nin: DARK } } as never, {
      projection: {
        name: 1, actor_id: 1, aliases: 1, alignment: 1, motivation: 1, kind: 1, targets: 1, sectors: 1,
        target_sectors: 1, credibility: 1, citations: 1, quote: 1, source_url: 1, claims_count: 1, last_seen: 1,
      },
    })
    .limit(200)
    .toArray();
}

async function readExposure(): Promise<ExposureDoc[]> {
  const db = await getDb();
  // Projection is the allow-list: samples, file lists and links are never read.
  return db
    .collection<ExposureDoc>("az_exposure")
    .find({ kind: { $nin: DARK }, source: { $nin: DARK } } as never, {
      projection: { org: 1, org_name: 1, victim: 1, sector: 1, claim_type: 1, group: 1, status: 1, kind: 1, source: 1, published: 1, first_seen: 1 },
    })
    .sort({ _id: -1 })
    .limit(300)
    .toArray();
}

type ItemExposureDoc = { cve_ids?: string[]; az_exposure?: { product?: string; count?: number; as_of_iso?: string } };

// Our own Shodan AZ counts on the dispatches that name these CVEs (items.cve_ids
// is indexed), newest first; the first count per CVE wins.
async function readAzExposureFor(cves: string[]): Promise<Map<string, AzExposureHit>> {
  const out = new Map<string, AzExposureHit>();
  if (!cves.length) return out;
  const db = await getDb();
  const docs = await db
    .collection<ItemExposureDoc>("items")
    .find(
      { ...(PUBLISHED_FILTER as object), cve_ids: { $in: cves }, "az_exposure.count": { $gt: 0 } },
      { projection: { cve_ids: 1, az_exposure: 1 } },
    )
    .sort({ effective_at: -1 })
    .limit(200)
    .toArray();
  for (const d of docs) {
    const ids = (d.cve_ids ?? []).map((c) => c.toUpperCase());
    if (ids.length > 5 || !d.az_exposure?.product) continue;
    for (const c of ids) {
      if (!cves.includes(c) || out.has(c)) continue;
      out.set(c, { product: String(d.az_exposure.product), count: Number(d.az_exposure.count ?? 0), asOf: d.az_exposure.as_of_iso ?? null });
    }
  }
  return out;
}

async function countIocs(actorIds: string[]): Promise<number | null> {
  if (!actorIds.length) return 0;
  try {
    const db = await getDb();
    return await db.collection("iocs").countDocuments({ actors: { $in: actorIds } }, { maxTimeMS: 3000 });
  } catch (err) {
    console.error("[az] iocs count unavailable:", err);
    return null;
  }
}

export async function getAzBoard(): Promise<AzBoard> {
  const [claimDocs, advDocs, exposure, trending] = await Promise.all([
    settle("claims", readClaims(), [] as ClaimDoc[]),
    settle("adversaries", readAdversaries(), [] as AdversaryDoc[]),
    settle("exposure", readExposure().then((d) => shapeExposure(d)), []),
    settle("exploits", getTrendingBoardCached(), { day: null, cards: [] }),
  ]);
  if (!claimDocs.ok && !advDocs.ok && !exposure.ok && !trending.ok) {
    // Nothing readable: throw so the last-good snapshot is served instead.
    throw new Error("az board: no source readable");
  }

  const claimRows = claimDocs.rows.map(toRow);
  const actorIds = [...new Set(advDocs.rows.map((d) => d.actor_id).filter((a): a is string => typeof a === "string" && !!a))];
  const cves = trending.rows.cards.map((c) => c.cve);
  const [names, azExposure, iocs] = await Promise.all([
    getActorNamesFor(actorIds).catch(() => new Map<string, string>()),
    readAzExposureFor(cves).catch(() => new Map<string, AzExposureHit>()),
    countIocs(actorIds),
  ]);
  const adv = shapeAdversaries(advDocs.rows, new Set(names.keys()));

  return {
    generatedAt: new Date().toISOString(),
    campaigns: { ok: claimDocs.ok, rows: groupCampaigns(claimRows, new Date()) },
    claims7d: claimDocs.ok ? claimRows.length : null,
    adversaries: { ok: advDocs.ok, rows: adv.cards },
    adversariesWithheld: adv.withheld,
    exposure,
    exploits: { ok: trending.ok, rows: selectAzExploits(trending.rows.cards, new Set(actorIds), azExposure) },
    exploitsDay: trending.rows.day,
    iocs: advDocs.ok ? iocs : null,
  };
}

// Five minutes, like /claims, with the last-good file fallback.
export const getAzBoardCached = unstable_cache(() => withSnapshot("az-board", getAzBoard), ["az-board-v1"], { revalidate: 300 });
