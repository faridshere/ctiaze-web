import { getDb } from "@/lib/db";

// Hacktivist / leak-site claims against Azerbaijan, written by the engine's
// hacktivist watch (ctiaze-engine cti/hacktivist.py → `hacktivist_posts`).
//
// What is public and what is not:
//   • telegram + bluesky posts that read like a claim, and ransomware leak-site
//     listings — each is someone else's CLAIM and is labelled as such;
//   • dark-web (ahmia/onion) hits never leave the private review channel: they are
//     noisy and an onion link to a leak is not something to publish.
// Onion URLs are also stripped from ransomware rows (link goes to ransomware.live).

export type ClaimCheck = { target: string; here: string; checkhost: string };

export type ClaimRow = {
  id: string;
  kind: "telegram" | "bluesky" | "ransomware";
  group: string;
  channel: string;
  url: string;
  at: string;              // ISO: when the claim was posted (falls back to when we saw it)
  seenAt: string;          // ISO: when the watch picked it up
  text: string;
  summaryEn: string | null;
  claimType: string | null;
  targets: string[];
  checks: ClaimCheck[];
  proof: string[];         // check-host report ids the claimant offered
};

export type ClaimStats = {
  total30d: number;
  groups: { group: string; n: number; last: string }[];
  byKind: Record<string, number>;
};

const PUBLIC_FILTER = {
  az: true,
  $or: [
    { kind: { $in: ["telegram", "bluesky"] }, claim_like: true },
    { kind: "ransomware" },
  ],
};

type Doc = {
  _id: string;
  kind: ClaimRow["kind"];
  group?: string;
  channel?: string;
  url?: string;
  published?: Date | null;
  first_seen: Date;
  text?: string;
  summary?: { summary_en?: string; claim_type?: string; targets?: string[] } | null;
  checks?: ClaimCheck[];
  ext?: { urls?: string[]; az_domains?: string[]; checkhost_reports?: string[] };
};

function safeUrl(d: Doc): string {
  const u = d.url ?? "";
  if (d.kind === "ransomware" && (u.includes(".onion") || !u.startsWith("http"))) {
    return `https://www.ransomware.live/`;
  }
  return u.startsWith("https://t.me/") || u.startsWith("https://bsky.app/") || u.startsWith("https://www.ransomware.live")
    ? u
    : "";
}

function toRow(d: Doc): ClaimRow {
  const at = (d.published ?? d.first_seen) as Date;
  const targets = d.summary?.targets?.length
    ? d.summary.targets
    : [...(d.ext?.az_domains ?? [])].slice(0, 6);
  return {
    id: String(d._id),
    kind: d.kind,
    group: d.group ?? d.channel ?? "unknown",
    channel: d.channel ?? "",
    url: safeUrl(d),
    at: new Date(at).toISOString(),
    seenAt: new Date(d.first_seen).toISOString(),
    text: (d.text ?? "").replace(/https?:\/\/\S+\.onion\S*/g, "[onion link removed]").slice(0, 420),
    summaryEn: d.summary?.summary_en ?? null,
    claimType: d.summary?.claim_type ?? (d.kind === "ransomware" ? "ransomware" : null),
    targets,
    checks: (d.checks ?? []).slice(0, 3),
    proof: (d.ext?.checkhost_reports ?? []).slice(0, 4),
  };
}

export async function getClaims(limit = 120): Promise<ClaimRow[]> {
  const db = await getDb();
  const docs = await db
    .collection<Doc>("hacktivist_posts")
    .aggregate<Doc>([
      { $match: PUBLIC_FILTER },
      { $addFields: { _at: { $ifNull: ["$published", "$first_seen"] } } },
      { $sort: { _at: -1 } },
      { $limit: Math.min(Math.max(limit, 1), 500) },
      { $project: { _at: 0, az_why: 0, tier: 0 } },
    ])
    .toArray();
  return docs.map(toRow);
}

export async function getClaimStats(): Promise<ClaimStats> {
  const db = await getDb();
  // Counted by when the claim was MADE, not when the watch first stored it: the
  // first run back-fills old leak-site listings, which are not "this month".
  const since = new Date(Date.now() - 30 * 86400_000);
  const match = { ...PUBLIC_FILTER, $expr: { $gte: [{ $ifNull: ["$published", "$first_seen"] }, since] } };
  const col = db.collection("hacktivist_posts");
  const [groups, kinds] = await Promise.all([
    col
      .aggregate<{ _id: string; n: number; last: Date }>([
        { $match: { ...match, kind: { $ne: "bluesky" } } },   // trackers repost; count the claimants
        { $group: { _id: "$group", n: { $sum: 1 }, last: { $max: { $ifNull: ["$published", "$first_seen"] } } } },
        { $sort: { n: -1, last: -1 } },
        { $limit: 8 },
      ])
      .toArray(),
    col.aggregate<{ _id: string; n: number }>([{ $match: match }, { $group: { _id: "$kind", n: { $sum: 1 } } }]).toArray(),
  ]);
  const byKind = Object.fromEntries(kinds.map((k) => [k._id, k.n]));
  return {
    total30d: kinds.reduce((a, k) => a + k.n, 0),
    groups: groups.map((g) => ({ group: g._id, n: g.n, last: new Date(g.last).toISOString() })),
    byKind,
  };
}
