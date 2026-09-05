import { cache } from "react";
import { getDb } from "../db";
import { slugify } from "../slug";
import type { StoryDoc } from "../types";

// Read-only access to the engine's `concept_guides` collection — 176 grounded
// AZ+EN explainers for attack types (head terms like "phishing nədir" that
// nobody serves in Azerbaijani). Each doc's `_id` IS the URL slug (clean,
// unique — e.g. "phishing", "data-breach", "sql-injection"); there is no
// separate slug field. Content is the engine's grounded model output, never
// invented here — this layer only shapes and links it.

export type GuideContent = {
  what: string;
  how: string;
  evidence: string;
  checklist: string[];
};

export type Guide = {
  slug: string; // == _id
  attackType: string; // human label, e.g. "data breach"
  az: GuideContent;
  en: GuideContent;
  evidenceItemIds: string[];
};

// One resolved evidence source. `href` is an internal /news permalink ONLY when
// the referenced item is actually published+visible on the site; otherwise it is
// null and the caller renders a plain source label instead of a broken link.
export type EvidenceSource = {
  id: string;
  titleAz: string;
  titleEn: string;
  source: string; // outlet key, e.g. "bleepingcomputer"
  sourceUrl: string; // external origin URL
  href: string | null;
};

type GuideDoc = {
  _id: string;
  attack_type?: string;
  az?: Partial<GuideContent>;
  en?: Partial<GuideContent>;
  evidence_item_ids?: string[];
  model?: string;
};

function content(o: Partial<GuideContent> | undefined): GuideContent {
  return {
    what: (o?.what ?? "").trim(),
    how: (o?.how ?? "").trim(),
    evidence: (o?.evidence ?? "").trim(),
    checklist: Array.isArray(o?.checklist)
      ? o!.checklist.map((s) => String(s).trim()).filter(Boolean)
      : [],
  };
}

function toGuide(doc: GuideDoc): Guide {
  return {
    slug: doc._id,
    attackType: (doc.attack_type ?? doc._id).trim(),
    az: content(doc.az),
    en: content(doc.en),
    evidenceItemIds: [...new Set(doc.evidence_item_ids ?? [])], // dedupe, keep order
  };
}

// cache() dedupes within a single request — the detail page calls getGuide in
// both generateMetadata and the body, and the whole catalogue is small (176
// docs), so one query serves getGuide / siblingGuides / getGuideSlugs alike.
export const getGuides = cache(async (): Promise<Guide[]> => {
  const db = await getDb();
  const docs = await db.collection<GuideDoc>("concept_guides").find({}).toArray();
  return docs
    .map(toGuide)
    .sort((a, b) => a.attackType.localeCompare(b.attackType, "en"));
});

export const getGuide = cache(async (slug: string): Promise<Guide | null> => {
  const all = await getGuides();
  return all.find((g) => g.slug === slug) ?? null;
});

export async function siblingGuides(slug: string, n = 6): Promise<Guide[]> {
  const all = await getGuides();
  const i = all.findIndex((g) => g.slug === slug);
  if (i < 0) return [];
  const out: Guide[] = [];
  for (let k = 1; k <= n; k++) out.push(all[(i + k) % all.length]);
  return out;
}

// Unique slugs for generateStaticParams. _id is unique by definition, but the
// Set guards the contract (zero duplicate slugs) regardless of source data.
export async function getGuideSlugs(): Promise<string[]> {
  const all = await getGuides();
  return [...new Set(all.map((g) => g.slug))];
}

// Resolve a guide's evidence_item_ids against the `items` collection so the page
// can (a) link the small published subset to their real /news permalinks and
// (b) still credit the rest as plain source labels. Order follows the guide's
// own evidence_item_ids. One $in query; read-only; cache()-deduped per request.
export const getGuideEvidence = cache(
  async (slug: string): Promise<EvidenceSource[]> => {
    const guide = await getGuide(slug);
    if (!guide || !guide.evidenceItemIds.length) return [];

    const db = await getDb();
    const docs = await db
      .collection<StoryDoc>("items")
      .find({ _id: { $in: guide.evidenceItemIds } })
      .project<
        Pick<
          StoryDoc,
          "_id" | "az_title" | "title" | "source" | "url"
        > & {
          published?: boolean;
          retracted?: boolean;
          blocked_unsafe?: boolean;
          az_stub?: boolean;
        }
      >({
        _id: 1,
        az_title: 1,
        title: 1,
        source: 1,
        url: 1,
        published: 1,
        retracted: 1,
        blocked_unsafe: 1,
        az_stub: 1,
      })
      .toArray();

    const byId = new Map(docs.map((d) => [d._id, d]));
    const out: EvidenceSource[] = [];
    for (const id of guide.evidenceItemIds) {
      const d = byId.get(id);
      if (!d) continue; // id not in items → skip rather than guess a label
      const titleEn = (d.title ?? "").trim();
      const titleAz = (d.az_title ?? "").trim() || titleEn;
      const isPublished =
        d.published === true &&
        d.retracted !== true &&
        d.blocked_unsafe !== true &&
        d.az_stub !== true;
      // slugify(id, az_title||title) reproduces exactly the slug lib/types.ts
      // stamps on a published story, so the link resolves via getStoryBySlug.
      const href = isPublished
        ? `/news/${slugify(id, d.az_title || d.title || "xeber")}`
        : null;
      out.push({
        id,
        titleAz,
        titleEn,
        source: (d.source ?? "").trim(),
        sourceUrl: (d.url ?? "").trim(),
        href,
      });
    }
    return out;
  },
);

// The evidence prose carries inline grounding markers — [<16-hex>], [url:<hex>],
// [cve:…] or [CVE-YYYY-NNNN] (optionally comma-joined). They are internal item
// references, not reader content, and don't link anywhere on their own, so we
// strip them for display and surface the real sources as a structured list
// instead. The pattern only matches these exact citation shapes, never ordinary
// bracketed prose.
const CITATION_RE =
  /\s*\[(?:(?:url:|cve:)?(?:[0-9a-f]{16}|CVE-\d{4}-\d{3,7}))(?:\s*,\s*(?:url:|cve:)?(?:[0-9a-f]{16}|CVE-\d{4}-\d{3,7}))*\]/gi;

export function stripCitations(s: string): string {
  return s
    .replace(CITATION_RE, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
