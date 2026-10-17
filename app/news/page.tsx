import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHead } from "@/components/site/PageHead";
import { ArchiveList } from "@/components/news/ArchiveList";
import { Pagination } from "@/components/news/Pagination";
import { getArchivePage, getStats } from "@/lib/stories";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The archive — every dispatch",
  description: "The full skopnix archive — every cyber-threat dispatch ever published, newest first.",
  alternates: { canonical: absoluteUrl("/news") },
};

const PER = 60;

// One cached page per ?p= value: stories + the total count in a single blob, so
// pagination never re-runs count/find twice. Bumped to v3 with the rebuild so a
// stale v2 entry (different row shape) can't leak into the new layout.
const getPage = unstable_cache(
  async (page: number) => {
    const [stories, stats] = await Promise.all([getArchivePage((page - 1) * PER, PER), getStats()]);
    return {
      total: stats.total,
      rows: stories.map((s) => ({
        slug: s.slug,
        title: s.titleEn || s.titleAz,
        kev: s.kev,
        cve: s.cveIds[0] ?? null,
        at: s.publishedAt,
        category: s.category,
        severity: s.severity,
      })),
    };
  },
  // NOTE: this caches the COMPUTED rows, and Next's Data Cache survives a
  // deployment — so neither a change to slugify() nor a retraction in the
  // database shows up here until this key changes or the hour elapses. Bump the
  // version to flush it (v3 -> v4: permalinks moved from Azerbaijani to English;
  // v4 -> v5: four regional digests were retracted and had to leave the feed now,
  // not in an hour; v5 -> v6: the v4 "Late Edition" rows carry category and
  // severity so the ledger can print the tag and weight its rules).
  //
  // A retraction taking up to an hour to disappear is the wrong behaviour for a
  // threat-intel site — the fix is a revalidate endpoint the pipeline can call
  // (revalidateTag) rather than a version bump per incident.
  ["news-archive-v6"],
  { revalidate: 3600 }
);

export default async function NewsArchive({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(999, parseInt(sp.p ?? "1", 10) || 1));
  const { total, rows } = await getPage(page);
  const pages = Math.max(1, Math.ceil(total / PER));

  // The running number of every dispatch in the paper: newest is № total, so a
  // row's ordinal is the total less everything above it on earlier pages and on
  // this one. The masthead's edition number is proven row by row.
  const offset = (page - 1) * PER;
  const ledger = rows.map((r, i) => ({ ...r, ordinal: total - offset - i }));
  const first = ledger[0]?.ordinal ?? null;
  const last = ledger[ledger.length - 1]?.ordinal ?? null;

  return (
    <>
      <SiteHeader section="Section C · The archive" />
      <main id="main">
        <PageHead
          kicker="Every edition · newest first"
          title="The archive."
          meta={
            <>
              <span>{total.toLocaleString("en-US")} dispatches</span>
              <span>
                page {page} / {pages}
              </span>
              {first !== null && last !== null && (
                <span>
                  № {first.toLocaleString("en-US")} – {last.toLocaleString("en-US")}
                </span>
              )}
            </>
          }
        />
        <ArchiveList rows={ledger} />
        <Pagination page={page} pages={pages} />
      </main>
      <SiteFooter total={total} />
    </>
  );
}
