import { getDb } from "./db";

// Mirrors the snapshot written by ctiaze-engine's cti/exposure.py into the
// exposure_snapshots collection. Read-only here.
export type RiskyService = {
  port: number;
  label: string;
  category: "remote-access" | "database" | "ics-scada" | string;
  count: number;
};
export type PortCount = { port: number; count: number };
export type OrgCount = { org: string; count: number };
export type ProductCount = { product: string; count: number };
export type CityCount = { city: string; count: number };
export type RegionalRow = {
  code: string;
  name: string;
  rdp: number;
  smb: number;
  telnet: number;
};
export type WatchlistItem = { name: string; note: string; count: number };

export type ExposureSnapshot = {
  _id: string;
  country: string;
  swept_at: Date | string;
  total_hosts: number;
  risky_services: RiskyService[];
  top_ports: PortCount[];
  top_orgs: OrgCount[];
  top_products: ProductCount[];
  cities?: CityCount[]; // optional: older snapshots predate these
  regional?: RegionalRow[];
  watchlist?: WatchlistItem[];
  source: string;
};

async function snapshots() {
  const db = await getDb();
  return db.collection<ExposureSnapshot>("exposure_snapshots");
}

export async function getLatestSnapshot(): Promise<ExposureSnapshot | null> {
  const col = await snapshots();
  return col.findOne({}, { sort: { swept_at: -1 } });
}

// Oldest→newest total_hosts, for a week-over-week trend line. Small (≤12).
export async function getTotalsTrend(
  limit = 12
): Promise<{ swept_at: string; total: number }[]> {
  const col = await snapshots();
  const docs = await col
    .find({}, { projection: { swept_at: 1, total_hosts: 1 } })
    .sort({ swept_at: -1 })
    .limit(limit)
    .toArray();
  return docs
    .map((d) => ({
      swept_at: new Date(d.swept_at).toISOString(),
      total: d.total_hosts,
    }))
    .reverse();
}
