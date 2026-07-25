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
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10">
        <Link
          href="/"
          className="font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
        >
          ← bütün xəbərlər
        </Link>

        <div className="mt-8 flex items-baseline gap-3 font-mono text-[11px] text-ink-muted">
          <time dateTime={story.publishedAt}>
            {date} · {time}
          </time>
          <SeverityMarker kev={story.kev} severity={story.severity} />
          <span className="uppercase tracking-wider">{story.category}</span>
          {story.region && <span className="text-ink-secondary">AZ</span>}
        </div>

        <h1 className="mt-3 font-headline text-3xl sm:text-4xl leading-tight text-ink-primary">
          {story.titleAz}
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-ink-secondary whitespace-pre-line">
          {story.bodyAz}
        </p>

        <div className="mt-10 pt-6 border-t border-hairline flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-ink-muted">
          {story.cveIds.length > 0 && (
            <span>{story.cveIds.join(", ")}</span>
          )}
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-secondary hover:text-ink-primary transition-colors"
          >
            mənbə →
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
