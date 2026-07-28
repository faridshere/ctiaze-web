import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-9 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="text-sm text-ink-secondary">
            50+ mənbə → AI qiymətləndirmə və yoxlama → Azərbaycan dilində. 24/7,
            insan müdaxiləsi olmadan.
          </p>
          <p className="mt-3 font-mono text-[11px] text-ink-muted">
            © {new Date().getFullYear()} ctiaze · Hackxana
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          <a href="/feed.json" className="hover:text-brand">feed.json</a>
          <a href="/rss.xml" className="hover:text-brand">rss</a>
          <Link href="/haqqinda" className="hover:text-brand">haqqında</Link>
          <a href="https://t.me/ctiaze" target="_blank" rel="noopener noreferrer" className="hover:text-brand">
            telegram ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
