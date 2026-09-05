"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Header nav item: mono micro-caps; the current section reads in starlight,
// the rest in muted ink. Client-only because it needs the pathname.
export function SiteNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
        active ? "text-ink-primary" : "text-ink-muted hover:text-ink-primary"
      }`}
    >
      {children}
    </Link>
  );
}
