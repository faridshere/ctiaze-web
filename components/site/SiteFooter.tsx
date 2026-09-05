import Link from "next/link";
import { CtiazeMark } from "@/components/CtiazeMark";
import { LINKS, SITE_TAGLINE } from "@/lib/site";
import { Button } from "./Button";

// Footer in three columns: identity, the dot-list of everything the site
// serves (pages and machine feeds alike), and the two outbound doors.
const PAGES = [
  { href: "/", label: "The wire" },
  { href: "/actors", label: "Adversaries" },
  { href: "/news", label: "Archive" },
  { href: "/about", label: "About" },
];
const FEEDS = [
  { href: LINKS.rss, label: "RSS" },
  { href: LINKS.jsonFeed, label: "JSON feed" },
  { href: LINKS.llms, label: "llms.txt" },
];

function DotList({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  return (
    <ul aria-label={label} className="space-y-2.5">
      {items.map((it) => (
        <li key={it.href} className="flex items-center gap-2.5">
          <span aria-hidden className="size-1.5 rounded-full bg-ink-muted/60" />
          <Link
            href={it.href}
            className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-ink-primary"
          >
            {it.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-[var(--sp-section)] border-t border-hairline">
      <div className="mx-auto grid max-w-[80rem] gap-10 px-[var(--sp-gutter)] py-14 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div>
          <div className="flex items-center gap-2.5">
            <CtiazeMark className="size-8 text-ink-primary" />
            <span className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-primary">
              skop<span className="text-brand">nix</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-secondary">{SITE_TAGLINE}</p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            sensor-backed across the Caucasus
          </p>
        </div>
        <DotList items={PAGES} label="Pages" />
        <DotList items={FEEDS} label="Machine feeds" />
        <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
          <Button href={LINKS.telegram} variant="pill" size="sm" glyph="↗">
            Telegram
          </Button>
          <Button href={LINKS.email} variant="pill" size="sm" glyph="↗">
            Email
          </Button>
        </div>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-3 px-[var(--sp-gutter)] py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <span>© {new Date().getFullYear()} skopnix</span>
          <span>grounded to source · nothing invented</span>
        </div>
      </div>
    </footer>
  );
}
