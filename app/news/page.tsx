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
      })),
    };
  },
  ["news-archive-v3"],
  { revalidate: 3600 }
);

export default async function NewsArchive({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(999, parseInt(sp.p ?? "1", 10) || 1));
  const { total, rows } = await getPage(page);
  const pages = Math.max(1, Math.ceil(total / PER));

  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHead
          kicker="Every dispatch · newest first"
          live
          title="The archive."
          meta={
            <>
              {total.toLocaleString("en-US")} dispatches · page {page} of {pages}
            </>
          }
        />
        <ArchiveList rows={rows} />
        <Pagination page={page} pages={pages} />
      </main>
      <SiteFooter />
    </>
  );
}
