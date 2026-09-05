import { urgencyHeader, exposureLine, storyActions } from "@/lib/storysignal";
import type { Story } from "@/lib/types";

// Web parity with the Telegram post: the same deterministic urgency, exposure and
// "what to do" signals, computed purely from pipeline-stamped fields (lib/story
// signal mirrors cti/publish.py — no LLM, no invented facts). The old 🔴/🟠/🛰️
// emoji are swapped for mono instrument labels (KEV/HIGH/SHODAN) so the block
// reads like a readout rather than a chat message.
export function StorySignals({ story }: { story: Story }) {
  const urgency = urgencyHeader(story, "en");
  const exposure = exposureLine(story, "en");
  const actions = storyActions(story, "en");
  if (!urgency && !exposure && actions.length === 0) return null;

  return (
    <div className="mt-5 flex flex-col gap-3">
      {urgency && (
        <div
          role="status"
          className={`flex items-center gap-2.5 rounded-[var(--radius-panel)] border px-3.5 py-2.5 ${
            urgency.tone === "critical"
              ? "border-accent-critical/40 bg-accent-critical/10 text-accent-critical"
              : "border-accent-warning/40 bg-accent-warning/10 text-accent-warning"
          }`}
        >
          <span className="shrink-0 rounded-[var(--radius-chip)] border border-current px-1 font-mono text-[length:var(--t-micro)] font-semibold uppercase tracking-wider">
            {urgency.tone === "critical" ? "KEV" : "HIGH"}
          </span>
          <span className="font-mono text-[13px] font-semibold">{urgency.text}</span>
        </div>
      )}
      {exposure && (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-panel)] border border-brand/30 bg-brand-wash px-3.5 py-2.5 text-brand">
          <span className="shrink-0 rounded-[var(--radius-chip)] border border-current px-1 font-mono text-[length:var(--t-micro)] font-semibold uppercase tracking-wider">
            SHODAN
          </span>
          <span className="font-mono text-[12.5px] leading-snug">{exposure}</span>
        </div>
      )}
      {actions.length > 0 && (
        <div className="rounded-[var(--radius-panel)] border border-hairline bg-surface-raised/40 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">What to do</div>
          <ul className="mt-2 space-y-1.5">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-secondary">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
