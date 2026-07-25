import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto max-w-2xl px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-medium tracking-[0.15em] text-ink-primary">
            CTIAZE
          </span>
          <span className="hidden sm:inline font-mono text-[11px] text-ink-muted">
            kiber-təhlükə kəşfiyyatı
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/haqqinda"
            className="font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            haqqında
          </Link>
          <a
            href="https://t.me/ctiaze"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            telegram
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
