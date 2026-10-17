import Link from "next/link";
import { Kicker } from "./Kicker";

// The head of an inner page, set like a section front: an optional way back,
// the section label, the headline in the slab, a mono meta line, and a 2px
// rule underneath so the page starts the way the front page does.
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
    <header className={`sheet pt-8 sm:pt-12 ${narrow ? "max-w-[52rem]" : ""}`}>
      {back && (
        <Link href={back.href} className="label mb-5 inline-block text-ink-3 transition-colors hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <Kicker live={live}>{kicker}</Kicker>
      <h1
        className={`headline mt-4 text-ink ${
          narrow ? "text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]" : "text-[clamp(2.6rem,7vw,5.5rem)]"
        }`}
      >
        {title}
      </h1>
      {meta && (
        <div className="num mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-3">
          {meta}
        </div>
      )}
      {children}
      <div className="rule-2 mt-6" />
    </header>
  );
}
