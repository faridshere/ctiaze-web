import Link from "next/link";
import { CtiazeMark } from "@/components/CtiazeMark";
import { LINKS, SITE_TAGLINE } from "@/lib/site";
import { EditionNo } from "./EditionNo";

// The colophon. Four cells under a 2px rule: the wordmark and tagline, the
// pages, the machine feeds, and the printer's line. Everything here is live
// and keyless; nothing is promised.
const PAGES = [
  { href: "/", label: "The wire" },
  { href: "/actors", label: "Adversaries" },
  { href: "/news", label: "Archive" },
  { href: "/claims", label: "Claims" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
];
const FEEDS = [
  { href: LINKS.api, label: "API docs" },
  { href: LINKS.rss, label: "RSS" },
  { href: LINKS.jsonFeed, label: "JSON feed" },
  { href: LINKS.llms, label: "llms.txt" },
  { href: LINKS.telegram, label: "Telegram ↗" },
];

// Fixed when the build warmed: the colophon says when this edition was set.
const BUILT_AT = new Date().toISOString().slice(0, 16).replace("T", " ");

function Col({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const external = (h: string) => /^https?:/.test(h);
  return (
    <ul aria-label={label} className="space-y-1.5">
      {items.map((it) => (
        <li key={it.href}>
          {external(it.href) ? (
            <a href={it.href} target="_blank" rel="noopener noreferrer" className="ulink text-[14px] text-ink-2 hover:text-ink">
              {it.label}
            </a>
          ) : (
            <Link href={it.href} className="ulink text-[14px] text-ink-2 hover:text-ink">
              {it.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({ total }: { total?: number | null }) {
  return (
    <footer className="sheet mt-[var(--sp-section)] pb-8">
      <div className="rule-2" />
      <div className="grid gap-8 py-8 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:gap-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-ink" aria-label="skopnix — home">
            <CtiazeMark className="size-6 text-ink" />
            <span className="font-wordmark text-[1.35rem] font-bold tracking-[-0.02em]">
              skop<span className="text-brand">nix</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-2">{SITE_TAGLINE}</p>
          <p className="label mt-3 text-ink-3">Worldwide coverage · exposure census: Caucasus &amp; Central Asia</p>
        </div>
        <div>
          <p className="label mb-3 text-ink-3">Pages</p>
          <Col items={PAGES} label="Pages" />
        </div>
        <div>
          <p className="label mb-3 text-ink-3">Machine feeds</p>
          <Col items={FEEDS} label="Machine feeds" />
        </div>
        <div className="font-mono text-[11.5px] leading-[1.7] text-ink-3 md:text-right">
          <p>Set in Hepta Slab, Archivo and IBM Plex Mono.</p>
          <p>Printed from Baku.</p>
          {typeof total === "number" && total > 0 && (
            <p>
              Edition <EditionNo total={total} />, set {BUILT_AT} UTC.
            </p>
          )}
        </div>
      </div>
      <div className="rule-soft flex flex-wrap items-center justify-between gap-3 pt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
        <span>© {new Date().getFullYear()} skopnix</span>
        <span>Grounded to source · nothing invented</span>
      </div>
    </footer>
  );
}
