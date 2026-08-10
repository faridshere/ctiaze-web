"use client";

import Link from "next/link";
import { LiveStatus } from "./LiveStatus";
import { SearchTrigger } from "./SearchTrigger";
import { CtiazeMark } from "./CtiazeMark";
import { NavLink } from "./NavLink";
import { LocaleToggle, useLocale } from "./locale";
import { getDict } from "@/lib/i18n";

const NAV: [string, keyof ReturnType<typeof getDict>["nav"]][] = [
  ["/", "feed"],
  ["/cve", "cve"],
  ["/ioc", "ioc"],
  ["/exposure", "exposure"],
  ["/actors", "actors"],
  ["/scan-me", "scanme"],
  ["/kripto", "kripto"],
  ["/haqqinda", "about"],
];

export function Header() {
  const locale = useLocale();
  const t = getDict(locale).nav;
  return (
    <header>
      <div className="sticky top-0 z-40 border-b border-hairline bg-surface">
        <div className="mx-auto flex h-12 max-w-[75rem] items-center gap-5 px-[var(--sp-gutter)]">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <CtiazeMark className="size-5 text-ink-primary transition-transform group-hover:scale-105" />
            <span className="font-headline text-lg font-semibold tracking-tight text-ink-primary">
              ctiaze
            </span>
          </Link>

          <nav className="hidden items-center gap-5 sm:flex">
            {NAV.map(([href, key]) => (
              <NavLink key={href} href={href}>
                {t[key]}
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
            <LocaleToggle initial={locale} />
            <SearchTrigger />
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-5 overflow-x-auto border-b border-hairline px-[var(--sp-gutter)] py-2.5 sm:hidden">
        {NAV.map(([href, key]) => (
          <NavLink key={href} href={href}>
            {t[key]}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
