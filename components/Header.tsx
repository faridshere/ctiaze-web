"use client";

import Link from "next/link";
import { LiveStatus } from "./LiveStatus";
import { SearchTrigger } from "./SearchTrigger";
import { CtiazeMark } from "./CtiazeMark";
import { NavLink } from "./NavLink";
import { useLocale } from "./locale";
import { getDict } from "@/lib/i18n";

// Focused nav (Farid, 2026-08-30): /exposure, /cve, /ioc stay live but leave
// the nav for now — the product story is wire → adversaries → scan → API.
const NAV: [string, keyof ReturnType<typeof getDict>["nav"]][] = [
  ["/", "feed"],
  ["/actors", "actors"],
  ["/stacknix", "stacknix"],
  ["/scan-me", "scanme"],
  ["/developers", "api"],
  ["/pricing", "pricing"],
  ["/about", "about"],
];

export function Header() {
  const locale = useLocale();
  const t = getDict(locale).nav;
  return (
    <header>
      <div className="sticky top-0 z-40 border-b border-hairline bg-surface">
        <div className="mx-auto flex h-12 max-w-[75rem] items-center gap-5 px-[var(--sp-gutter)]">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <CtiazeMark className="size-[22px] text-ink-primary transition-all group-hover:scale-105" />
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
            <SearchTrigger />
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-5 overflow-x-auto border-b border-hairline px-[var(--sp-gutter)] py-2.5 xl:hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
        {NAV.map(([href, key]) => (
          <NavLink key={href} href={href}>
            {t[key]}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
