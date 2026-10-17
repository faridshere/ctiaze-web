import Link from "next/link";

// The archive pager, in the label voice: "← Later editions · page N / M ·
// Earlier editions →" under a 1px ink rule. Later = newer (a lower page
// number), earlier = older. An end that has nowhere to go renders as a struck
// label in ink-3, not a dead link (a disabled Link would still be crawlable
// and clickable) and not a faded one (opacity fell to 1.95:1 on both stocks).
export function Pagination({ page, pages }: { page: number; pages: number }) {
  const off = "label text-ink-3 line-through decoration-1";
  const on = "label ulink text-ink";
  return (
    <nav aria-label="Archive pages" className="sheet mt-10 pb-4">
      <div className="rule flex items-center justify-between gap-4 pt-3">
        {page > 1 ? (
          <Link href={page - 1 === 1 ? "/news" : `/news?p=${page - 1}`} className={on} rel="prev">
            ← Later editions
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            ← Later editions
          </span>
        )}
        <span className="num font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
          page {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={`/news?p=${page + 1}`} className={on} rel="next">
            Earlier editions →
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            Earlier editions →
          </span>
        )}
      </div>
    </nav>
  );
}
