import Link from "next/link";
import { categoryName } from "@/lib/taxonomy";
import type { Story } from "@/lib/types";

const UTC_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const UTC_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// A story permalink is read worldwide, so its dateline is pinned to UTC — the
// one absolute instant every reader can check against — rather than Baku
// local time (lib/format's formatStoryDate). Kept local to the story head.
function formatUtcStamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${UTC_DAYS[d.getUTCDay()]} ${p(d.getUTCDate())} ${UTC_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    time: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
  };
}

// The headline size follows the title's length, as on the front page lead: a
// six-word title is set like a splash, a sixty-word advisory title like a
// sub-head. One step below the lead's sizes, since this is an inside page.
function headlineSize(title: string): string {
  const n = title.length;
  if (n <= 48) return "text-[clamp(2.4rem,5.4vw,5rem)]";
  if (n <= 90) return "text-[clamp(2rem,4.2vw,3.8rem)]";
  if (n <= 140) return "text-[clamp(1.6rem,3.2vw,2.8rem)]";
  return "text-[clamp(1.4rem,2.5vw,2.2rem)]";
}

// The story head, set like a story page: the way back to the archive, one
// dateline label (category, the day filed, the time in UTC) in ink, the stamp
// at the right when CISA says actively exploited (the only red in the head:
// the dateline does not repeat it), the headline in the slab, and
// the mono dateline beneath it: filed time, the outlet that broke it, and how
// many other outlets carried it when the pipeline recorded any.
export function StoryHead({
  story,
  hasSource,
  host,
  code,
}: {
  story: Story;
  hasSource: boolean;
  host: string;
  code: string;
}) {
  const { date, time } = formatUtcStamp(story.publishedAt);
  const also = story.altSources.length;
  return (
    <header className="sheet pt-8 sm:pt-12">
      <Link href="/news" className="label inline-block text-ink-3 transition-colors hover:text-ink">
        ← The archive
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p className="label text-ink-3">
          <span className="text-ink">{categoryName(story.category, "en")}</span>
          {" · "}
          {date}
          {" · "}
          <span className="num normal-case tracking-normal">{time}</span> UTC
        </p>
        {story.kev && <span className="stamp shrink-0">Actively exploited</span>}
      </div>

      <h1 className={`headline mt-5 max-w-[26ch] text-ink ${headlineSize(story.titleEn)}`}>{story.titleEn}</h1>

      <p className="num mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-3">
        <span>
          Filed <time dateTime={story.publishedAt}>{time}</time> UTC
        </span>
        {hasSource && (
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={host}
            aria-label={`Source: ${host}`}
            className="ulink hover:text-ink"
          >
            Source {code} ↗
          </a>
        )}
        {also > 0 && (
          <span>
            also carried by {also} outlet{also === 1 ? "" : "s"}
          </span>
        )}
      </p>
      <div className="rule-2 mt-6" />
    </header>
  );
}
