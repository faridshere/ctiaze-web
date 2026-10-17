import { urgencyHeader, exposureLine, storyActions, signalExplainer } from "@/lib/storysignal";
import type { Story } from "@/lib/types";
import { RuledSection } from "./Ruled";

// Web parity with the Telegram post: the same deterministic urgency, exposure
// and "what to do" signals, computed purely from pipeline-stamped fields
// (lib/storysignal mirrors cti/publish.py — no LLM, no invented facts). Set
// as a ruled ledger: a stamp (KEV, in stamp red, or HIGH in ink) beside the
// readout in Archivo (prose is never set in mono), the Shodan line, the
// plain-language gloss, and the actions as a list, numbered only when there
// are two or more.
export function StorySignals({ story }: { story: Story }) {
  const urgency = urgencyHeader(story, "en");
  const exposure = exposureLine(story, "en");
  const actions = storyActions(story, "en");
  const explainer = signalExplainer(story);
  if (!urgency && !exposure && actions.length === 0) return null;

  return (
    <RuledSection label="Signals" meta="as the pipeline stamped them">
      <dl className="divide-y divide-rule-soft">
        {urgency && (
          <div role="status" className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-3 py-3">
            <dt>
              <span className={urgency.tone === "critical" ? "stamp" : "stamp stamp-ink"}>{urgency.tone === "critical" ? "KEV" : "High"}</span>
            </dt>
            <dd className="text-[14px] leading-snug text-ink">{urgency.text}</dd>
          </div>
        )}
        {exposure && (
          <div className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-3 py-3">
            <dt>
              <span className="stamp stamp-ink">Shodan</span>
            </dt>
            <dd className="text-[14px] leading-snug text-ink">{exposure}</dd>
          </div>
        )}
        {actions.length > 0 && (
          <div className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-3 py-3">
            <dt className="label text-ink-3">What to do</dt>
            <dd>
              <ol className="space-y-1.5">
                {actions.map((a, i) =>
                  actions.length > 1 ? (
                    <li key={i} className="grid grid-cols-[2ch_1fr] gap-x-2 text-[14px] leading-snug text-ink-2">
                      <span className="num font-mono text-[11px] text-ink-3">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ) : (
                    <li key={i} className="text-[14px] leading-snug text-ink-2">
                      {a}
                    </li>
                  )
                )}
              </ol>
            </dd>
          </div>
        )}
      </dl>
      {explainer && <p className="mt-3 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-3">{explainer}</p>}
    </RuledSection>
  );
}
