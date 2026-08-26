"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Nav link with an active/current-page state — mono micro-caps, and a 2px amber
// underline on the active route (amber is interaction-only, so this is on-doctrine).
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const className = `whitespace-nowrap border-b-2 pb-1 font-mono text-[length:var(--t-meta)] uppercase tracking-[0.08em] transition-colors ${
    active
      ? "border-brand text-ink-primary"
      : "border-transparent text-ink-secondary hover:text-ink-primary"
  }`;
  // Static files, external URLs, and /radar (a rewrite to the static console,
  // not an App Router route) can't be client-navigated by Next's <Link> — it
  // would prefetch a non-existent RSC payload and dead-click. Render a plain
  // anchor so the browser does a real navigation.
  const isDocumentHref =
    /^https?:\/\//.test(href) || href.endsWith(".html") || href === "/radar";
  if (isDocumentHref) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}
