"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A section link in the masthead: condensed label, a hairline underline on
// hover, the current section underlined in ink.
export function SiteNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const base = href.split("#")[0] || "/";
  const active = base !== "/" && (path === base || path.startsWith(`${base}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`label whitespace-nowrap underline-offset-[5px] transition-colors ${
        active ? "text-ink underline decoration-ink" : "text-ink-3 hover:text-ink hover:underline hover:decoration-rule-soft"
      }`}
    >
      {children}
    </Link>
  );
}
