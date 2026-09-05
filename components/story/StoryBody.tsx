import { SpektrStrip } from "@/components/SpektrStrip";
import type { Story } from "@/lib/types";

// The article text, preceded by the mini category-spectrum strip (real counts
// from the recent-dispatch sample actually fetched) so a reader sees where this
// briefing sits in the live feed before reading the prose itself.
export function StoryBody({ story, recent }: { story: Story; recent: Story[] }) {
  return (
    <>
      {recent.length > 0 && (
        <div className="mt-5">
          <SpektrStrip
            stories={recent}
            variant="mini"
            ownCategory={story.category}
            caption={`last ${recent.length} dispatches · spectrum`}
          />
        </div>
      )}
      <div className="mt-6 h-px w-full bg-hairline" />
      <p className="mt-7 max-w-[42rem] whitespace-pre-line text-[length:var(--t-body)] leading-[1.75] text-ink-secondary">
        {story.summaryEn || story.bodyAz}
      </p>
    </>
  );
}
