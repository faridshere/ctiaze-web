import Link from "next/link";

// One archive row — enough to scan a slug, its title and its priority flags
// without opening it. `at` is always an ISO-8601 UTC timestamp (Mongo's
// published_at), so date math below never depends on the runtime's local clock.
export type ArchiveRow = {
  slug: string;
  title: string;
  kev: boolean;
  cve: string | null;
  at: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The day-divider key and label are both derived from the ISO string's own UTC
// calendar date (never the machine's local timezone), so the grouping a visitor
// sees is identical to what was rendered at build/ISR time on Vercel.
function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function utcDayLabel(iso: string): string {
  const d = new Date(iso);
  const weekday = WEEKDAYS[d.getUTCDay()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS[d.getUTCMonth()];
  return `${weekday} ${day} ${month} ${d.getUTCFullYear()}`;
}

function utcTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// The full archive as a dated ledger: a sticky day divider (so the header always
// tells you which day you're scrolled into) over rows of [time | title | flags].
export function ArchiveList({ rows }: { rows: ArchiveRow[] }) {
  // Precomputed once, then read by index — reassigning a "last seen day" variable
  // inside the .map callback trips the purity lint (mutation escaping render), so
  // "is this the first row of a new day" is derived purely from position instead.
  const dayKeys = rows.map((r) => utcDayKey(r.at));
  return (
    <div className="mx-auto mt-10 w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <ol>
        {rows.map((r, i) => {
          const isNewDay = i === 0 || dayKeys[i] !== dayKeys[i - 1];
          return (
            <li key={r.slug}>
              {isNewDay && (
                <div className={`sticky top-14 z-10 flex items-center gap-3 bg-surface/95 py-2.5 backdrop-blur-sm ${i === 0 ? "" : "mt-8"}`}>
                  <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                    {utcDayLabel(r.at)}
                  </span>
                  <span aria-hidden className="limb-line h-px flex-1" />
                </div>
              )}
              <Link
                href={`/news/${r.slug}`}
                className="group grid grid-cols-[3.25rem_1fr_auto] items-baseline gap-4 border-b border-hairline py-3.5 transition-colors hover:bg-surface-hover sm:grid-cols-[3.75rem_1fr_auto]"
              >
                <time dateTime={r.at} className="whitespace-nowrap font-mono text-[11px] tabular-nums text-ink-muted">
                  {utcTime(r.at)}
                </time>
                <span className="text-[15px] leading-snug text-ink-primary transition-colors group-hover:text-brand sm:text-[16px]">
                  {r.title}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  {r.kev && (
                    <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 py-px font-semibold text-surface">
                      KEV
                    </span>
                  )}
                  {r.cve && (
                    <span className="rounded-[var(--radius-chip)] border border-hairline px-1 py-px text-ink-muted">
                      {r.cve}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
