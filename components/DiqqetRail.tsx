"use client";

import Link from "next/link";
import { StoryLink } from "./StoryLink";
import { StackWatch } from "./StackWatch";
import { formatStoryDate } from "@/lib/format";
import { useLocale } from "./locale";
import { getDict } from "@/lib/i18n";
import type { Story } from "@/lib/types";

// The "Diqqət" (attention) rail — the honest analog of Ground News's Blindspot:
// not "what one side underreports" but "the rare, high-signal items you should not
// miss" — actively-exploited (KEV) and locally-relevant (AZ). Each section renders
// ONLY when it has content, then the tool instruments. All content is real.
export function DiqqetRail({
  stories,
  kevStories,
  azStories,
  azHosts,
  archive,
}: {
  stories: Story[];
  kevStories: Story[];
  azStories: Story[];
  azHosts: number;
  archive: number;
}) {
  const locale = useLocale();
  const t = getDict(locale).feed;
  return (
    <div className="flex flex-col gap-7 border-t border-hairline pt-6 min-[1100px]:border-t-0 min-[1100px]:pt-0">
      <StackWatch stories={stories} />
      {kevStories.length > 0 && (
        <RailList caption={t.railKev(kevStories.length)} tone="text-accent-critical" stories={kevStories} locale={locale} />
      )}
      {azStories.length > 0 && (
        <RailList caption={t.railAz(azStories.length)} tone="text-brand" stories={azStories} locale={locale} />
      )}

      <Link
        href="/cve"
        className="border-t border-hairline pt-5 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-brand"
      >
        {t.cveRegistry}
      </Link>

      <div className="flex flex-col gap-5 border-t border-hairline pt-5">
        <ToolTeaser
          href="/exposure"
          label={t.toolExposure}
          title={azHosts > 0 ? t.exposureHosts(azHosts.toLocaleString("en-US")) : t.exposureFallback}
        />
        <ToolTeaser href="/ioc" label={t.toolIoc} title={t.iocTitle} />
        <ToolTeaser href="/kripto" label={t.toolKripto} title={t.kriptoTitle} />
      </div>

      <div className="border-t border-hairline pt-4 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] text-ink-muted">
        {t.archivePre} <span className="tabular-nums text-ink-secondary">{archive}</span> {t.archiveSuf}
      </div>
    </div>
  );
}

function RailList({ caption, tone, stories, locale }: { caption: string; tone: string; stories: Story[]; locale: "az" | "en" }) {
  return (
    <div>
      <div className={`font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] ${tone}`}>
        {caption}
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {stories.map((s) => {
          const { time } = formatStoryDate(s.publishedAt);
          const title = locale === "en" ? s.titleEn : s.titleAz;
          return (
            <li key={s.id}>
              <StoryLink slug={s.slug} title={title} className="group flex gap-2.5">
                <span className="shrink-0 pt-0.5 font-mono text-[length:var(--t-micro)] tabular-nums text-ink-muted">
                  {time}
                </span>
                <span className="text-[length:var(--t-meta)] leading-snug text-ink-secondary transition-colors group-hover:text-ink-primary">
                  {title}
                </span>
              </StoryLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ToolTeaser({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <Link href={href} className="group block">
      <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-brand">
        {label}
      </div>
      <div className="mt-1 font-headline text-[length:var(--t-row)] font-semibold leading-tight text-ink-primary transition-colors group-hover:text-brand">
        {title} <span aria-hidden>→</span>
      </div>
    </Link>
  );
}
