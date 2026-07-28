"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Nav link with an active/current-page state (flagged by UI review — the nav
// gave no indication of where you are).
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap text-sm transition-colors ${
        active ? "text-brand" : "text-ink-secondary hover:text-ink-primary"
      }`}
    >
      {children}
    </Link>
  );
}
