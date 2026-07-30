import Link from "next/link";
import { LiveStatus } from "./LiveStatus";
import { SearchTrigger } from "./SearchTrigger";
import { CtiazeMark } from "./CtiazeMark";
import { NavLink } from "./NavLink";

const NAV = [
  ["/", "Xəbərlər"],
  ["/ioc", "IOC / CVE"],
  ["/exposure", "Exposure"],
  ["/kripto", "Kripto"],
  ["/haqqinda", "Haqqında"],
];

export function Header() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          <CtiazeMark className="size-6 text-ink-primary transition-transform group-hover:scale-105" />
          <span className="font-headline text-xl font-bold tracking-tight text-ink-primary">
            ctiaze
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {NAV.map(([href, label]) => (
            <NavLink key={href} href={href}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3.5">
          <span className="hidden items-center gap-2 rounded-full border border-hairline px-2.5 py-1 md:inline-flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
            </span>
            <LiveStatus />
          </span>
          <SearchTrigger />
        </div>
      </div>

      {/* Mobile nav — the desktop nav is hidden on small screens, so surface the
          tabs (Exposure / Kripto must be reachable) as a scrollable row. */}
      <nav className="flex items-center gap-6 overflow-x-auto border-t border-hairline px-4 py-2.5 sm:hidden">
        {NAV.map(([href, label]) => (
          <NavLink key={href} href={href}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
