import Link from "next/link";
import { StoryLink } from "./StoryLink";
import { formatStoryDate } from "@/lib/format";
import type { Story } from "@/lib/types";

// The "Diqqət" (attention) rail — the honest analog of Ground News's Blindspot:
// not "what one side underreports" but "the rare, high-signal items you should not
// miss" — actively-exploited (KEV) and locally-relevant (AZ). Each section renders
// ONLY when it has content, then the tool instruments. All content is real.
export function DiqqetRail({
  kevStories,
  azStories,
  azHosts,
  archive,
}: {
  kevStories: Story[];
  azStories: Story[];
  azHosts: number;
  archive: number;
}) {
  return (
    <div className="flex flex-col gap-7 border-t border-hairline pt-6 min-[1100px]:border-t-0 min-[1100px]:pt-0">
      {kevStories.length > 0 && (
        <RailList
          caption={`KEV · aktiv istismar ${kevStories.length}`}
          tone="text-accent-critical"
          stories={kevStories}
        />
      )}
      {azStories.length > 0 && (
        <RailList
          caption={`AZ · regional ${azStories.length}`}
          tone="text-brand"
          stories={azStories}
        />
      )}

      <Link
        href="/cve"
        className="border-t border-hairline pt-5 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-brand"
      >
        CVE reyestri →
      </Link>

      <div className="flex flex-col gap-5 border-t border-hairline pt-5">
        <ToolTeaser
          href="/exposure"
          label="Alət · Exposure"
          title={
            azHosts > 0
              ? `Azərbaycanda ${azHosts.toLocaleString("en-US")} açıq host`
              : "Hücum səthi mənzərəsi"
          }
        />
        <ToolTeaser href="/ioc" label="Alət · IOC / CVE" title="Göstərici və CVE yoxlaması" />
        <ToolTeaser href="/kripto" label="Alət · Kripto" title="Kripto ünvan kəşfiyyatı" />
      </div>

      <div className="border-t border-hairline pt-4 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] text-ink-muted">
        arxiv: <span className="tabular-nums text-ink-secondary">{archive}</span> dispaç
      </div>
    </div>
  );
}

function RailList({ caption, tone, stories }: { caption: string; tone: string; stories: Story[] }) {
  return (
    <div>
      <div className={`font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] ${tone}`}>
        {caption}
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {stories.map((s) => {
          const { time } = formatStoryDate(s.publishedAt);
          return (
            <li key={s.id}>
              <StoryLink slug={s.slug} title={s.titleAz} className="group flex gap-2.5">
                <span className="shrink-0 pt-0.5 font-mono text-[length:var(--t-micro)] tabular-nums text-ink-muted">
                  {time}
                </span>
                <span className="text-[length:var(--t-meta)] leading-snug text-ink-secondary transition-colors group-hover:text-ink-primary">
                  {s.titleAz}
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
