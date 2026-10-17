import { outletCode, outletHost } from "@/lib/outlets";
import type { Story } from "@/lib/types";
import { RuledSection } from "./Ruled";

// Attribution as a ledger: every outlet that ran this story, one ruled row
// each (code, host, primary or also), so the reader picks where to read it —
// never a fabricated "N sources" count. Prints only when more than one outlet
// carried the story: the primary source already stands in the dateline and in
// the facts box, and the colophon carries the site's grounding line, so a
// third "grounded" badge here would be decoration.
export function StorySources({
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
  const outlets: { url: string; code: string; host: string; primary: boolean }[] = [];
  if (hasSource) outlets.push({ url: story.sourceUrl, code, host, primary: true });
  for (const u of story.altSources) outlets.push({ url: u, code: outletCode(u), host: outletHost(u), primary: false });

  if (outlets.length < 2) return null;
  return (
    <RuledSection label={`Sources · ${outlets.length}`} meta="outlets reporting the same story">
      <ol>
        {outlets.map((o) => (
          <li key={o.url} className="row">
            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${o.primary ? "Primary source" : "Also reported by"}: ${o.host}`}
              className="group grid min-h-[44px] grid-cols-[4.5rem_1fr_auto] items-center gap-x-3 py-2"
            >
              <span className="num font-mono text-[12px] text-ink">{o.code}</span>
              <span className="min-w-0 truncate text-[14px] text-ink-2 group-hover:text-ink group-hover:underline">{o.host}</span>
              <span className="label whitespace-nowrap text-ink-3">{o.primary ? "Primary ↗" : "Also ↗"}</span>
            </a>
          </li>
        ))}
      </ol>
    </RuledSection>
  );
}
