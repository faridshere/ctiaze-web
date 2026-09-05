import { PageHead } from "@/components/site/PageHead";
import { Button } from "@/components/site/Button";
import { GlyphChip } from "@/components/GlyphChip";
import { FlagChips } from "@/components/FlagChips";
import { categoryName } from "@/lib/taxonomy";
import type { Story } from "@/lib/types";

const UTC_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// A story permalink is read worldwide, so its meta timestamp is pinned to UTC —
// the one absolute instant every reader can check against — rather than Baku
// local time (lib/format's formatStoryDate, used by the ledger's day-dividers).
// Kept local to the story head rather than added to lib/format.
function formatUtcStamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = UTC_MONTHS[parseInt(get("month"), 10) - 1] ?? "";
  return { date: `${get("day")} ${month} ${get("year")}`, time: `${get("hour")}:${get("minute")}` };
}

// The story head: a breadcrumb back to the archive, the PageHead kicker/title,
// and a meta row of the same signals the Telegram post carries (category, KEV/
// CVE/region/EPSS flags, the outbound primary source) so the two surfaces read
// as one product.
export function StoryHead({
  story,
  epssLabel,
  hasSource,
  host,
  code,
}: {
  story: Story;
  epssLabel: string | null;
  hasSource: boolean;
  host: string;
  code: string;
}) {
  const { date, time } = formatUtcStamp(story.publishedAt);
  return (
    <>
      <PageHead
        narrow
        back={{ href: "/news", label: "archive" }}
        kicker={
          <>
            {categoryName(story.category, "en")} · {date} · {time} UTC
          </>
        }
        title={story.titleEn}
        meta={
          <>
            <GlyphChip category={story.category} />
            <FlagChips kev={story.kev} cveIds={story.cveIds} region={story.region} epssLabel={epssLabel} />
            {hasSource && (
              <Button
                href={story.sourceUrl}
                variant="ghost"
                size="sm"
                glyph="↗"
                className="ml-auto"
                ariaLabel={`Source: ${host}`}
              >
                source · {code}
              </Button>
            )}
          </>
        }
      />
    </>
  );
}
