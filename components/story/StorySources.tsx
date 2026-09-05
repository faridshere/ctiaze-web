import { Button } from "@/components/site/Button";
import { outletCode, outletHost } from "@/lib/outlets";
import type { Story } from "@/lib/types";

// Ground-News-style attribution: every outlet that ran this story, so the reader
// picks where to read it — never a fabricated "N sources" count. The "grounded"
// line always renders (even for a self-generated story with no outlet), since it
// is a claim about the site's own sourcing discipline, not about this one story.
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
  return (
    <>
      {story.altSources.length > 0 && (
        <div className="mt-8 border-t border-hairline pt-5">
          <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-muted">
            Sources · {story.altSources.length + (hasSource ? 1 : 0)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasSource && (
              <Button href={story.sourceUrl} variant="ghost" size="sm" glyph="↗" ariaLabel={`Primary source: ${host}`}>
                {code} · primary
              </Button>
            )}
            {story.altSources.map((u) => (
              <Button key={u} href={u} variant="ghost" size="sm" glyph="↗" ariaLabel={`Also reported by ${outletHost(u)}`}>
                {outletCode(u)}
              </Button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[length:var(--t-micro)] text-ink-muted">
            outlets reporting the same story — pick one to read
          </p>
        </div>
      )}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline pt-5 font-mono text-[length:var(--t-meta)] text-ink-muted">
        <span className="text-accent-good">grounded ✓</span>
        {hasSource && (
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={host}
            className="uppercase tracking-wider transition-colors hover:text-ink-primary"
          >
            primary source ↗
          </a>
        )}
      </div>
    </>
  );
}
