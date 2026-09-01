import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getArchivePage, getStats } from "@/lib/stories";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The archive — every dispatch",
  description: "The full skopnix archive — every cyber-threat dispatch ever published, newest first.",
  alternates: { canonical: "https://skopnix.com/news" },
};

const PER = 60;

const getPage = unstable_cache(
  async (page: number) => {
    const [stories, stats] = await Promise.all([getArchivePage((page - 1) * PER, PER), getStats()]);
    return {
      total: stats.total,
      rows: stories.map((s) => ({
        slug: s.slug, title: s.titleEn || s.titleAz, kev: s.kev,
        cve: s.cveIds[0] ?? null, at: s.publishedAt,
      })),
    };
  },
  ["news-archive-v2"],
  { revalidate: 3600 }
);

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export default async function NewsArchive({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(999, parseInt(sp.p ?? "1", 10) || 1));
  const { total, rows } = await getPage(page);
  const pages = Math.max(1, Math.ceil(total / PER));

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20">
        <h1 className="font-headline text-3xl font-bold tracking-[-0.01em] text-ink-primary sm:text-4xl">The archive</h1>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-muted">
          {total.toLocaleString("en-US")} dispatches · newest first · page {page} of {pages}
        </p>

        <ol className="mt-8">
          {rows.map((r) => (
            <li key={r.slug}>
              <Link href={`/news/${r.slug}`} className="group grid grid-cols-[auto_1fr] items-baseline gap-4 border-b border-hairline py-3.5">
                <span className="whitespace-nowrap font-mono text-[12px] tabular-nums text-ink-muted">{fmt(r.at)}</span>
                <span>
                  <span className="text-[15px] leading-snug text-ink-primary transition-colors group-hover:text-brand">{r.title}</span>
                  <span className="ml-2 inline-flex gap-1.5 align-middle font-mono text-[10px] uppercase tracking-wider">
                    {r.kev && <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-semibold text-surface">KEV</span>}
                    {r.cve && <span className="rounded-[var(--radius-chip)] border border-hairline px-1 py-px text-ink-muted">{r.cve}</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <nav className="mt-10 flex items-center justify-between font-mono text-[12px] uppercase tracking-wider">
          {page > 1 ? (
            <Link href={`/news?p=${page - 1}`} className="text-ink-secondary hover:text-brand">← newer</Link>
          ) : <span className="text-ink-muted/40">← newer</span>}
          <span className="text-ink-muted">{page} / {pages}</span>
          {page < pages ? (
            <Link href={`/news?p=${page + 1}`} className="text-ink-secondary hover:text-brand">older →</Link>
          ) : <span className="text-ink-muted/40">older →</span>}
        </nav>
      </main>
      <Footer />
    </div>
  );
}
