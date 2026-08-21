// Mirrors the shape of a published document in ctiaze-engine's MongoDB "items"
// collection (see ctiaze-engine/cti/store.py + publish.py). Read-only here.
import { slugify } from "./slug";

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
  // Pipeline-stamped triage signals the Telegram post shows but the site dropped.
  cvss?: number;
  epss?: number;             // FIRST.org exploit probability 0..1
  sev_rank?: number;         // 0..4
  kind?: string;             // e.g. "exposure_spike" (deterministic, never model-set)
  az_exposure?: { product?: string; count?: number; as_of?: string };
  // Precomputed semantic neighbours (ops/embed_related.py) — small denormalized
  // list so the story page can render "related" with no extra query / no live inference.
  related?: { id: string; slug: string; az_title?: string; title?: string; sim?: number }[];
};

export type Story = {
  id: string;
  slug: string;
  titleAz: string;
  bodyAz: string;
  related: { slug: string; titleAz: string; titleEn: string }[];
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
  cvss: number | null;
  epss: number | null;
  sevRank: number;
  kind: string | null;
  azExposure: { product: string; count: number; asOf: string } | null;
};

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
    related: (doc.related ?? [])
      .filter((r) => r?.slug)
      .slice(0, 5)
      .map((r) => ({ slug: r.slug, titleAz: r.az_title || r.title || "", titleEn: r.title || r.az_title || "" })),
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
    cvss: typeof doc.cvss === "number" && doc.cvss > 0 ? doc.cvss : null,
    epss: typeof doc.epss === "number" && doc.epss > 0 ? doc.epss : null,
    sevRank: typeof doc.sev_rank === "number" ? doc.sev_rank : 0,
    kind: doc.kind ?? null,
    azExposure:
      doc.az_exposure && doc.az_exposure.product && (doc.az_exposure.count ?? 0) > 0
        ? {
            product: String(doc.az_exposure.product),
            count: Number(doc.az_exposure.count),
            asOf: String(doc.az_exposure.as_of ?? ""),
          }
        : null,
  };
}
