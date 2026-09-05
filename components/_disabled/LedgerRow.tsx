"use client";

import { StoryLink } from "./StoryLink";
import { GlyphChip } from "../GlyphChip";
import { FlagChips } from "../FlagChips";
import { formatStoryDate } from "@/lib/format";
import { epssBadge } from "@/lib/storysignal";
import { outletCode, outletHost } from "@/lib/outlets";
import { useLocale } from "./locale";
import { getDict } from "@/lib/_disabled/i18n";
import type { Story } from "@/lib/types";

// One ledger entry. The DOM shape is identical for the lead (display) entry and a
// dense row — only type size and excerpt length differ — so the page reads as one
// continuous instrument. The telemetry gutter sits left on desktop and reflows to
// an inline first line on phones (same DOM order, CSS grid re-templating only).
export function LedgerRow({ story, display = false }: { story: Story; display?: boolean }) {
  const locale = useLocale();
  const t = getDict(locale).feed;
  const { time } = formatStoryDate(story.publishedAt);
  const host = outletHost(story.sourceUrl);
  const code = outletCode(story.sourceUrl);
  // Self-generated stories (e.g. the weekly exposure digest) have no external
  // source URL — rendering the "mənbə ↗" anchor for them is a dead click (href
  // absent) with a placeholder "SRC" code, so only link when it's a real URL.
  const hasSource = /^https?:\/\//i.test(story.sourceUrl || "");
  const title = locale === "en" ? story.titleEn : story.titleAz;
  // EN summary can be empty (digest/older docs) — fall back to the AZ body so an
  // EN row never loses its excerpt entirely (same tradeoff the RSS feed makes).
  const body = locale === "en" ? story.summaryEn || story.bodyAz : story.bodyAz;
  return (
    <article className="grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-hairline py-[var(--sp-row)] transition-colors first:border-t-0 hover:bg-surface-raised min-[700px]:grid-cols-[7rem_minmax(0,1fr)] min-[1100px]:grid-cols-[9.5rem_minmax(0,1fr)]">
      {/* gutter: telemetry — inline row on phone, stacked column on ≥700px */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[length:var(--t-meta)] text-ink-muted min-[700px]:flex-col min-[700px]:items-start min-[700px]:gap-1.5">
        <time dateTime={story.publishedAt} className="tabular-nums">
          {time}
        </time>
        <span className="flex items-center gap-1.5">
          <GlyphChip category={story.category} />
          <span className="uppercase tracking-[0.06em]">{code}</span>
        </span>
        <FlagChips kev={story.kev} cveIds={story.cveIds} region={story.region} epssLabel={epssBadge(story)} />
      </div>

      {/* main */}
      <div className="min-w-0">
        <StoryLink slug={story.slug} title={title} className="group block">
          <h2
            className={`font-headline font-semibold text-ink-primary transition-colors group-hover:text-brand ${
              display
                ? "text-[length:var(--t-display)] leading-[1.05] tracking-[-0.01em]"
                : "text-[length:var(--t-row)] leading-[1.3]"
            }`}
          >
            {title}
          </h2>
          {body && (
            <p
              className={`mt-1.5 text-[length:var(--t-body)] leading-[1.6] text-ink-secondary ${
                display ? "max-w-[42rem] line-clamp-3" : "line-clamp-2"
              }`}
            >
              {body}
            </p>
          )}
        </StoryLink>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[length:var(--t-meta)] text-ink-muted">
          <span className="text-accent-good">{t.grounded}</span>
          {hasSource && (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={host}
              className="transition-colors hover:text-brand"
            >
              {t.source} · {code} ↗
            </a>
          )}
          {story.altSources.length > 0 && (
            <span className="text-ink-secondary" title={t.moreSourcesTitle}>
              {t.moreSources(story.altSources.length)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
