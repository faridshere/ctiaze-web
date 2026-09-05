import Link from "next/link";
import { Kicker } from "./Kicker";

// Secondary-page head (archive, story, about): an optional way back, a
// left-aligned kicker, the display title, and a mono meta line. Wide and
// quiet — the xintra rhythm.
export function PageHead({
  kicker,
  live = false,
  title,
  meta,
  children,
  narrow = false,
  back,
}: {
  kicker: React.ReactNode;
  live?: boolean;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  /** article measure instead of the full page width */
  narrow?: boolean;
  /** breadcrumb rendered above the kicker */
  back?: { href: string; label: string };
}) {
  return (
    <header className={`mx-auto w-full px-[var(--sp-gutter)] pt-12 sm:pt-20 ${narrow ? "max-w-[46rem]" : "max-w-[80rem]"}`}>
      {back && (
        <Link
          href={back.href}
          className="mb-6 block w-fit font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink-primary"
        >
          ← {back.label}
        </Link>
      )}
      <Kicker live={live}>{kicker}</Kicker>
      <h1
        className={`mt-6 font-display font-semibold leading-[1.0] tracking-[-0.03em] text-ink-primary ${
          narrow ? "text-[clamp(1.9rem,4.6vw,3.1rem)]" : "text-[clamp(2.6rem,7vw,5.6rem)]"
        }`}
      >
        {title}
      </h1>
      {meta && (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-muted">
          {meta}
        </div>
      )}
      {children}
    </header>
  );
}
