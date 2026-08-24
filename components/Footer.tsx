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
            © {new Date().getFullYear()} ctiaze · Hackxana
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          <a href="/feed.json" className="hover:text-brand">feed.json</a>
          <a href="/rss.xml" className="hover:text-brand">rss</a>
          <Link href="/sektor" className="hover:text-brand">{t.sectors}</Link>
          <Link href="/hucum" className="hover:text-brand">{t.guides}</Link>
          <Link href="/lugat" className="hover:text-brand">{t.glossary}</Link>
          <Link href="/haqqinda" className="hover:text-brand">{t.about}</Link>
          <a href="https://t.me/ctiaze" target="_blank" rel="noopener noreferrer" className="hover:text-brand">
            telegram ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
