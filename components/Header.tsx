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
  ["/exposure", "exposure"],
  ["/cve", "cve"],
  ["/ioc", "ioc"],
  ["/actors", "actors"],
  ["/developers", "api"],
  ["/pricing", "pricing"],
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
            <CtiazeMark className="size-5 text-ink-primary transition-all group-hover:scale-105 group-hover:drop-shadow-[0_0_6px_rgba(255,90,31,0.55)]" />
            <span className="font-display text-lg font-semibold tracking-[-0.015em] text-ink-primary">
              skop<span className="text-brand">nix</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-4 xl:flex">
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
            <LocaleToggle />
            <SearchTrigger />
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-5 overflow-x-auto border-b border-hairline px-[var(--sp-gutter)] py-2.5 xl:hidden">
        {NAV.map(([href, key]) => (
          <NavLink key={href} href={href}>
            {t[key]}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
