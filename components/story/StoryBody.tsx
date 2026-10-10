import { SpektrStrip, type SpektrItem } from "@/components/SpektrStrip";
import type { Story } from "@/lib/types";
import { completeSentences } from "@/lib/format";

// The article text, preceded by the mini category-spectrum strip (real counts
// from the recent-dispatch sample actually fetched) so a reader sees where this
// briefing sits in the live feed before reading the prose itself.
// Server side: strip each Story to the four fields the client strip counts, so
// the RSC payload carries 60 small objects instead of 60 full stories.
function toSpektrItems(stories: Story[]): SpektrItem[] {
  return stories.map((s) => ({ category: s.category, kev: s.kev, region: s.region, hasCve: s.cveIds.length > 0 }));
}

export function StoryBody({ story, recent }: { story: Story; recent: Story[] }) {
  return (
    <>
      {recent.length > 0 && (
        <div className="mt-5">
          <SpektrStrip
            stories={toSpektrItems(recent)}
            variant="mini"
            ownCategory={story.category}
            caption={`last ${recent.length} dispatches · spectrum`}
          />
        </div>
      )}
      <div className="mt-6 h-px w-full bg-hairline" />
      <p className="mt-7 max-w-[42rem] whitespace-pre-line text-[length:var(--t-body)] leading-[1.75] text-ink-secondary">
        {completeSentences(story.summaryEn || story.bodyAz)}
      </p>
    </>
  );
}
