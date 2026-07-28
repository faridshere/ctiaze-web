import { StoryLink } from "./StoryLink";
import { SeverityMarker } from "./SeverityMarker";
import { formatStoryDate } from "@/lib/format";
import type { Story } from "@/lib/types";

export function StoryRow({ story }: { story: Story }) {
  const { time, date } = formatStoryDate(story.publishedAt);
  const excerpt =
    story.bodyAz.length > 150 ? story.bodyAz.slice(0, 150).trim() + "…" : story.bodyAz;
  const flagged = story.kev || story.severity === "critical";

  return (
    <StoryLink
      slug={story.slug}
      title={story.titleAz}
      className={`group -mx-3 flex gap-4 rounded-md border-l-2 py-5 pl-3 pr-3 transition-colors hover:bg-surface-raised hover:shadow-[var(--shadow-card)] ${
        flagged ? "border-l-accent-critical" : "border-l-transparent"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-muted">
          <time
            dateTime={story.publishedAt}
            title={`${date} · ${time} (Baku)`}
            className="tabular-nums"
          >
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

        <h3 className="font-headline text-[1.25rem] font-semibold leading-snug tracking-tight text-ink-primary group-hover:text-brand">
          {story.titleAz}
        </h3>

        {excerpt && (
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-secondary line-clamp-2">
            {excerpt}
          </p>
        )}
      </div>
    </StoryLink>
  );
}
