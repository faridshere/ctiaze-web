import { getDb } from "./db";
import { getActorById } from "./threatactors";

// Read-only view of ctiaze-engine's monthly situation snapshots, assembled for the
// /situation ("Vəziyyət") report. Three collections, one current snapshot each:
//   • trends              — 18-month series (series:attack_types / :categories /
//                           :threat_actors / :cves) + a bilingual `summary` doc.
//   • threat_landscape    — section docs (top_actors, sectors, top_cves, …) + a
//                           bilingual `summary` doc with rollup stats.
//   • defender_priorities — a single `az-orgs` doc: 8 ranked attack types, each
//                           with grounded AZ/EN mitigation steps.
// Every field is guarded — the report degrades to whatever the archive actually
// holds, never inventing a number. Nothing here is written; strictly read-only.

export type TrendItem = { name: string; count: number };
export type MonthPoint = { month: string; items: number };

export type TopActor = {
  id: string | null;
  name: string;
  type: string;
  victimCount: number;
  activityCount: number;
  lastActive: string | null;
  // /actors/[slug] when the actor resolves in threat_actors, else null (rendered
  // as plain text — we never link a dossier that does not exist).
  slug: string | null;
};

export type CveItem = { cve: string; count: number; kev: boolean; cwe: string | null };

export type Priority = {
  attackType: string;
  incidentCount: number;
  actionsAz: string[];
  actionsEn: string[];
};

export type Situation = {
  period: {
    from: string | null; // "YYYY-MM"
    to: string | null; // "YYYY-MM"
    months: number | null;
    generatedAt: string | null; // ISO
  };
  trends: {
    attackTypes: TrendItem[];
    categories: TrendItem[];
    monthly: MonthPoint[]; // incident volume per month across the window
    peak: MonthPoint | null;
    summaryAz: string | null;
    summaryEn: string | null;
  };
  landscape: {
    summaryAz: string | null;
    summaryEn: string | null;
    topActors: TopActor[];
    sectors: TrendItem[];
    topCves: CveItem[];
    kevCount: number | null;
    totalItems: number | null;
    totalCves: number | null;
  };
  priorities: {
    note: string | null;
    items: Priority[];
    totalIncidents: number | null;
    totalMitigations: number | null;
  };
};

// ---------------------------------------------------------------------------
// Guards — coerce loosely-typed Mongo values to the exact shapes above.
// ---------------------------------------------------------------------------
type RawDoc = { _id: string } & Record<string, unknown>;

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function strList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : [];
}
function trendItems(v: unknown, limit = 20): TrendItem[] {
  if (!Array.isArray(v)) return [];
  const out: TrendItem[] = [];
  for (const it of v) {
    const o = rec(it);
    const name = str(o.name);
    const count = num(o.count);
    if (name && count !== null) out.push({ name, count });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Assemble the snapshot. Throws only if the DB is unreachable (caught upstream).
// ---------------------------------------------------------------------------
async function build(): Promise<Situation> {
  const db = await getDb();
  const [trendDocs, tlDocs, dpDocs] = await Promise.all([
    db.collection<RawDoc>("trends").find({}).toArray(),
    db.collection<RawDoc>("threat_landscape").find({}).toArray(),
    db.collection<RawDoc>("defender_priorities").find({}).toArray(),
  ]);

  const trendsById = new Map(trendDocs.map((d) => [d._id, d]));
  const tlById = new Map(tlDocs.map((d) => [d._id, d]));

  const attackTypesDoc = trendsById.get("series:attack_types");
  const categoriesDoc = trendsById.get("series:categories");
  const trendSummary = trendsById.get("summary");
  const anySeries = attackTypesDoc ?? categoriesDoc ?? trendsById.get("series:cves");

  // Period: prefer the trends summary, fall back to any series doc.
  const periodSrc = rec(trendSummary ?? anySeries);
  const period = {
    from: str(periodSrc.from_month),
    to: str(periodSrc.to_month),
    months: num(periodSrc.window_months),
    generatedAt: str(periodSrc.generated_at) ?? str(rec(tlById.get("summary")).generated_at),
  };

  // Monthly incident volume from the attack-types series (each month carries an
  // `items` count — the honest "how much happened" signal for the trend visual).
  const rawMonths = Array.isArray(rec(attackTypesDoc).months) ? (rec(attackTypesDoc).months as unknown[]) : [];
  const monthly: MonthPoint[] = [];
  for (const m of rawMonths) {
    const o = rec(m);
    const month = str(o.month);
    const items = num(o.items);
    if (month) monthly.push({ month, items: items ?? 0 });
  }
  const peak = monthly.length
    ? monthly.reduce((a, b) => (b.items > a.items ? b : a), monthly[0])
    : null;

  // ---- landscape ----
  const lsSummary = rec(tlById.get("summary"));
  const lsTotals = rec(rec(lsSummary.stats).totals);
  const actorsDoc = rec(tlById.get("top_actors"));
  const rawActors = Array.isArray(actorsDoc.actors) ? (actorsDoc.actors as unknown[]) : [];

  const baseActors = rawActors.slice(0, 12).map((it) => {
    const o = rec(it);
    const id = str(o.id);
    return {
      id,
      name: str(o.name) ?? id ?? "—",
      type: str(o.type) ?? "unknown",
      victimCount: num(o.victim_count) ?? 0,
      activityCount: num(o.activity_count) ?? 0,
      lastActive: str(o.last_active),
    };
  });

  // Resolve each actor's dossier slug via getActorById (id === threat_actors._id
  // in this dataset). getActorById caches the full roster, so this is one round
  // trip regardless of count; a miss simply leaves the name un-linked.
  const topActors: TopActor[] = await Promise.all(
    baseActors.map(async (a) => {
      let slug: string | null = null;
      if (a.id) {
        try {
          slug = (await getActorById(a.id)) ? a.id : null;
        } catch {
          slug = null;
        }
      }
      return { ...a, slug };
    }),
  );

  const sectors = trendItems(rec(tlById.get("sectors")).sectors, 12);

  const cvesDocRaw = rec(tlById.get("top_cves"));
  const topCves: CveItem[] = (Array.isArray(cvesDocRaw.cves) ? (cvesDocRaw.cves as unknown[]) : [])
    .map((it) => {
      const o = rec(it);
      const cve = str(o.cve);
      if (!cve) return null;
      return { cve, count: num(o.count) ?? 0, kev: o.kev === true, cwe: str(o.cwe) };
    })
    .filter((x): x is CveItem => x !== null)
    .slice(0, 12);

  // ---- priorities ----
  const dp = dpDocs.find((d) => d._id === "az-orgs") ?? dpDocs[0];
  const dpRec = rec(dp);
  const priorityItems: Priority[] = (Array.isArray(dpRec.ranked) ? (dpRec.ranked as unknown[]) : [])
    .map((it) => {
      const o = rec(it);
      const attackType = str(o.attack_type);
      if (!attackType) return null;
      return {
        attackType,
        incidentCount: num(o.incident_count) ?? 0,
        actionsAz: strList(o.actions_az),
        actionsEn: strList(o.actions_en),
      };
    })
    .filter((x): x is Priority => x !== null);

  return {
    period,
    trends: {
      attackTypes: trendItems(rec(attackTypesDoc).overall_top, 12),
      categories: trendItems(rec(categoriesDoc).overall_top, 12),
      monthly,
      peak,
      summaryAz: str(rec(trendSummary).az),
      summaryEn: str(rec(trendSummary).en),
    },
    landscape: {
      summaryAz: str(lsSummary.az),
      summaryEn: str(lsSummary.en),
      topActors,
      sectors,
      topCves,
      kevCount: num(lsSummary.kev_count) ?? num(cvesDocRaw.kev_count) ?? num(lsTotals.kev_items),
      totalItems: num(lsTotals.items),
      totalCves: num(lsTotals.cves),
    },
    priorities: {
      note: str(dpRec.generated_note),
      items: priorityItems,
      totalIncidents: num(dpRec.total_incidents),
      totalMitigations: num(dpRec.total_mitigations),
    },
  };
}

// Short-lived module cache (mirrors lib/threatactors' roster cache): keeps the
// snapshot warm between ISR regenerations without re-hitting Mongo each request.
// TTL sits just under the page's revalidate window.
let cache: { at: number; data: Situation } | null = null;
const TTL_MS = 55 * 60_000;

export async function getSituation(): Promise<Situation | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const data = await build();
    cache = { at: Date.now(), data };
    return data;
  } catch {
    // DB blip: serve the last good snapshot if we have one, else signal "no data".
    return cache?.data ?? null;
  }
}
