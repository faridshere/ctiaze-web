// Mirrors the shape of a published document in ctiaze-engine's MongoDB "items"
// collection (see ctiaze-engine/cti/store.py + publish.py). Read-only here.
export type StoryDoc = {
  _id: string;
  title: string;
  url: string;
  source: string;
  cve_ids?: string[];
  severity?: "critical" | "high" | "medium" | "low" | null;
  kev?: boolean;
  ai_category?: string;
  ai_score?: number;
  ai_region?: boolean;
  az_title?: string;
  az_body?: string;
  summary?: string;
  published_at?: Date | string;
  alt_sources?: { source?: string; url?: string; title?: string }[];
};

export type Story = {
  id: string;
  slug: string;
  titleAz: string;
  bodyAz: string;
  titleEn: string;
  summaryEn: string;
  sourceUrl: string;
  category: string;
  score: number;
  kev: boolean;
  severity: string | null;
  region: boolean;
  cveIds: string[];
  publishedAt: string; // ISO
  altSources: string[]; // URLs of other outlets that ran the same story (deduped)
};

function slugify(id: string, titleAz: string): string {
  const base = titleAz
    .toLowerCase()
    .replace(/[^a-z0-9əıöüğşç\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  // id already carries a stable hash/cve — prefix it so the slug is always
  // unique and stable even if two titles collide or a title is empty.
  const shortId = id.replace(/^(cve:|url:)/, "").slice(0, 12);
  return `${shortId}-${base}`.replace(/-+$/, "");
}

export function toStory(doc: StoryDoc): Story {
  const publishedAt = doc.published_at
    ? new Date(doc.published_at).toISOString()
    : new Date().toISOString();
  // "Also reported by" — other outlets that ran the same story, deduped by URL and
  // never the primary source, so a reader can choose where to read it.
  const altSources: string[] = [];
  for (const a of doc.alt_sources ?? []) {
    const u = (a?.url ?? "").trim();
    if (u && u !== doc.url && !altSources.includes(u)) altSources.push(u);
  }
  return {
    id: doc._id,
    slug: slugify(doc._id, doc.az_title || doc.title || "xəbər"),
    titleAz: doc.az_title || doc.title,
    bodyAz: doc.az_body || "",
    titleEn: doc.title,
    summaryEn: doc.summary || "",
    sourceUrl: doc.url,
    category: doc.ai_category || "other",
    score: doc.ai_score ?? 0,
    kev: Boolean(doc.kev),
    severity: doc.severity ?? null,
    region: Boolean(doc.ai_region),
    cveIds: doc.cve_ids ?? [],
    publishedAt,
    altSources: altSources.slice(0, 6),
  };
}
