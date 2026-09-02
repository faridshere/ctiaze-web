"use client";

import Link from "next/link";
import { useLocale } from "./locale";
import { getDict } from "@/lib/i18n";

export function Footer() {
  const locale = useLocale();
  const t = getDict(locale).footer;
  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-9 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="text-sm text-ink-secondary">{t.tagline}</p>
          <p className="mt-3 font-mono text-[11px] text-ink-muted">
            © {new Date().getFullYear()} skopnix
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          <Link href="/" className="hover:text-brand">skopnix.com</Link>
        </nav>
      </div>
    </footer>
  );
}
