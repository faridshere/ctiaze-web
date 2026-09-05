import { Button } from "@/components/site/Button";

// Archive pager: ghost buttons at each end, a mono "page / total" counter in the
// middle. An end that has nowhere to go renders as a muted span, not a dead link
// (a disabled Link would still be crawlable and clickable).
export function Pagination({ page, pages }: { page: number; pages: number }) {
  const disabledCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted/40";
  return (
    <nav
      aria-label="Archive pages"
      className="mx-auto mt-2 flex w-full max-w-[80rem] items-center justify-between px-[var(--sp-gutter)] pb-16"
    >
      {page > 1 ? (
        <Button href={`/news?p=${page - 1}`} variant="ghost" size="sm">
          ← newer
        </Button>
      ) : (
        <span className={disabledCls}>← newer</span>
      )}
      <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-muted">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Button href={`/news?p=${page + 1}`} variant="ghost" size="sm">
          older →
        </Button>
      ) : (
        <span className={disabledCls}>older →</span>
      )}
    </nav>
  );
}
