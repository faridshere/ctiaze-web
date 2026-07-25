import Link from "next/link";
import { SeverityMarker } from "./SeverityMarker";
import { formatStoryDate } from "@/lib/format";
import type { Story } from "@/lib/types";

export function StoryRow({ story }: { story: Story }) {
  const { time, date } = formatStoryDate(story.publishedAt);
  const excerpt = story.bodyAz.length > 140 ? story.bodyAz.slice(0, 140).trim() + "…" : story.bodyAz;

  return (
    <Link
      href={`/xeber/${story.slug}`}
      className="group block py-5 border-b border-hairline first:pt-0 hover:bg-surface-raised/60 -mx-4 px-4 transition-colors"
    >
      <div className="flex items-baseline gap-3 font-mono text-[11px] text-ink-muted mb-2">
        <time dateTime={story.publishedAt} title={`${date} · ${time} (Baku)`}>
          {time}
        </time>
        <SeverityMarker kev={story.kev} severity={story.severity} />
        <span className="uppercase tracking-wider">{story.category}</span>
        {story.region && (
          <span className="text-ink-secondary" title="Azərbaycan/regionla əlaqəli">
            AZ
          </span>
        )}
        {story.cveIds[0] && <span>{story.cveIds[0]}</span>}
      </div>

      <h2 className="font-headline text-[1.35rem] leading-snug text-ink-primary group-hover:opacity-70 transition-opacity">
        {story.titleAz}
      </h2>

      {excerpt && (
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-secondary line-clamp-2">
          {excerpt}
        </p>
      )}
    </Link>
  );
}
