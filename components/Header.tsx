import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { LiveStatus } from "./LiveStatus";

export function Header() {
  return (
    <header>
      <div className="mx-auto max-w-5xl px-4 flex items-center justify-between h-9 border-b border-hairline">
        <LiveStatus />
        <a
          href="https://t.me/ctiaze"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted hover:text-ink-primary transition-colors"
        >
          @ctiaze — telegram
        </a>
      </div>

      <div className="mx-auto max-w-5xl px-4 flex items-end justify-between py-5">
        <Link href="/" className="group">
          <span className="block font-headline italic text-3xl sm:text-4xl tracking-tight text-ink-primary">
            ctiaze
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted mt-1.5">
            kiber-təhlükə kəşfiyyatı jurnalı
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/haqqinda"
            className="font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            haqqında
          </Link>
          <ThemeToggle />
        </nav>
      </div>

      <div className="border-t-[3px] border-ink-primary" />
      <div className="border-t border-hairline mt-[2px]" />
    </header>
  );
}
