import Link from "next/link";
import { LiveStatus } from "./LiveStatus";
import { SearchTrigger } from "./SearchTrigger";
import { CtiazeMark } from "./CtiazeMark";

export function Header() {
  return (
    <header>
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-9 border-b border-hairline">
        <LiveStatus />
        <a
          href="https://t.me/ctiaze"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink-primary transition-colors"
        >
          @ctiaze — telegram ↗
        </a>
      </div>

      <div className="mx-auto max-w-5xl px-4 flex items-end justify-between gap-4 py-6">
        <Link href="/" className="group flex items-center gap-3.5">
          <CtiazeMark className="size-8 sm:size-9 text-ink-primary shrink-0 transition-transform group-hover:scale-105" />
          <span>
            <span className="block font-headline italic text-3xl sm:text-[2.6rem] leading-none tracking-tight text-ink-primary">
              ctiaze
            </span>
            <span className="mt-2 block font-mono text-[9.5px] sm:text-[10px] uppercase tracking-[0.3em] text-ink-muted">
              kiber-təhlükə kəşfiyyatı jurnalı
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 pb-1">
          <SearchTrigger />
          <Link
            href="/exposure"
            className="hidden sm:inline font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            ekspozisiya
          </Link>
          <Link
            href="/kripto"
            className="hidden sm:inline font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            kripto
          </Link>
          <Link
            href="/haqqinda"
            className="font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            haqqında
          </Link>
        </nav>
      </div>

      <div className="border-t-[3px] border-ink-primary" />
      <div className="border-t border-hairline mt-[3px]" />
    </header>
  );
}
