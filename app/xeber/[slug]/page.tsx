import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SeverityMarker } from "@/components/SeverityMarker";
import { formatStoryDate } from "@/lib/format";
import { getStoryBySlug } from "@/lib/stories";

export const revalidate = 180;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: "Tapılmadı" };
  return {
    title: story.titleAz,
    description: story.bodyAz.slice(0, 160),
    openGraph: {
      title: story.titleAz,
      description: story.bodyAz.slice(0, 160),
      type: "article",
      publishedTime: story.publishedAt,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const { time, date } = formatStoryDate(story.publishedAt);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-12">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink-primary transition-colors"
        >
          ← bütün dispaçlar
        </Link>

        <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] text-ink-muted">
          <time dateTime={story.publishedAt}>
            {date} · {time}
          </time>
          <SeverityMarker kev={story.kev} severity={story.severity} />
          <span className="uppercase tracking-wider">{story.category}</span>
          {story.region && <span className="text-ink-secondary">AZ</span>}
          {story.cveIds[0] && <span>{story.cveIds[0]}</span>}
        </div>

        <h1 className="mt-4 font-headline text-[2rem] sm:text-[2.6rem] leading-[1.1] text-ink-primary">
          {story.titleAz}
        </h1>

        <div className="mt-6 h-px w-full bg-hairline" />

        <p className="mt-7 text-lg leading-[1.75] text-ink-secondary whitespace-pre-line drop-cap">
          {story.bodyAz}
        </p>

        <div className="mt-12 pt-6 border-t border-hairline flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-xs text-ink-muted">
          {story.cveIds.length > 0 ? (
            <span className="text-ink-secondary">{story.cveIds.join(" · ")}</span>
          ) : (
            <span />
          )}
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="uppercase tracking-wider text-ink-secondary hover:text-ink-primary transition-colors"
          >
            ilkin mənbə ↗
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
