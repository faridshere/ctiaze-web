import Link from "next/link";
import { SeverityMarker } from "./SeverityMarker";
import { formatStoryDate } from "@/lib/format";
import type { Story } from "@/lib/types";

export function StoryRow({ story, index }: { story: Story; index: number }) {
  const { time, date } = formatStoryDate(story.publishedAt);
  const excerpt = story.bodyAz.length > 140 ? story.bodyAz.slice(0, 140).trim() + "…" : story.bodyAz;
  const flagged = story.kev || story.severity === "critical";

  return (
    <Link
      href={`/xeber/${story.slug}`}
      className={`group flex gap-3 py-5 border-b border-hairline border-l-[3px] first:pt-0 hover:bg-surface-raised/60 -mx-4 pl-[13px] pr-4 transition-colors ${
        flagged ? "border-l-accent-critical" : "border-l-transparent"
      }`}
    >
      <span className="hidden sm:block shrink-0 w-6 pt-0.5 font-mono text-[11px] text-ink-muted/50 tabular-nums">
        {String(index).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
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

        <h2 className="font-headline text-[1.35rem] leading-snug text-ink-primary">
          {story.titleAz}
        </h2>

        {excerpt && (
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-secondary line-clamp-2">
            {excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}
