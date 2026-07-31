import Link from "next/link";
import { LiveStatus } from "./LiveStatus";
import { SearchTrigger } from "./SearchTrigger";
import { CtiazeMark } from "./CtiazeMark";
import { NavLink } from "./NavLink";

const NAV = [
  ["/", "Lent"],
  ["/cve", "CVE"],
  ["/ioc", "IOC"],
  ["/exposure", "Exposure"],
  ["/kripto", "Kripto"],
  ["/haqqinda", "Haqqında"],
];

export function Header() {
  return (
    <header>
      {/* sticky top bar (48px) — the mobile nav row below it stays in normal flow
          and scrolls away */}
      <div className="sticky top-0 z-40 border-b border-hairline bg-surface">
        <div className="mx-auto flex h-12 max-w-[75rem] items-center gap-5 px-[var(--sp-gutter)]">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <CtiazeMark className="size-5 text-ink-primary transition-transform group-hover:scale-105" />
            <span className="font-headline text-lg font-semibold tracking-tight text-ink-primary">
              ctiaze
            </span>
          </Link>

          <nav className="hidden items-center gap-5 sm:flex">
            {NAV.map(([href, label]) => (
              <NavLink key={href} href={href}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
              </span>
              <LiveStatus />
            </span>
            <SearchTrigger />
          </div>
        </div>
      </div>

      {/* Mobile nav — non-sticky, six links in a scrollable row (nothing hidden) */}
      <nav className="flex items-center gap-5 overflow-x-auto border-b border-hairline px-[var(--sp-gutter)] py-2.5 sm:hidden">
        {NAV.map(([href, label]) => (
          <NavLink key={href} href={href}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
