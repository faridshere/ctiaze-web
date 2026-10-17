import Link from "next/link";
import { CtiazeMark } from "@/components/CtiazeMark";
import { Dial, dialCaption } from "@/components/home/Dial";
import { UtcClock } from "@/components/home/UtcClock";
import { LINKS } from "@/lib/site";
import { GlyphChip } from "@/components/GlyphChip";
import type { WireRow } from "@/lib/home-data";
import { EditionNo } from "./EditionNo";
import { EditionToggle } from "./EditionToggle";
import { StickyStrip } from "./StickyStrip";
import { TodayLine } from "./TodayLine";
import { SiteNavLink } from "./SiteNavLink";

// The masthead. On the front page: the tape (40px, black in both editions),
// then the nameplate between three rules, the untouched logo dead centre, the
// edition number left, the 24-hour dial and the dateline right, and the
// sections beneath. Every other page gets the compact strip with a section
// line. Once the nameplate scrolls off, the strip slides in (StickyStrip).
// Exactly five sections (2026-10-17): the tool first. Archive, About and the
// census live in the colophon; Exploits returns when its board is populated.
// Phones print the product's two (the check and its API): with Telegram and
// the edition toggle beside them, two longer labels clipped at 390px.
const NAV: { href: string; label: string; phone: boolean }[] = [
  { href: "/stack", label: "Stack check", phone: true },
  { href: "/actors", label: "Adversaries", phone: false },
  { href: "/claims", label: "Claims", phone: false },
  { href: "/az", label: "Azerbaijan", phone: false },
  { href: "/api-docs", label: "API", phone: true },
];

function Wordmark({ mark, text, className = "" }: { mark: string; text: string; className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 text-ink ${className}`} aria-label="skopnix — home">
      <CtiazeMark className={`${mark} shrink-0 text-ink`} />
      <span className={`font-wordmark font-bold tracking-[-0.02em] ${text}`}>
        skop<span className="text-brand">nix</span>
      </span>
    </Link>
  );
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function Tape({ row, serverIso }: { row: WireRow | null; serverIso: string }) {
  return (
    <div className="bg-tape text-tape-ink" data-tape>
      <div className="sheet grid h-10 grid-cols-[auto_1fr] items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
        <span className="label inline-flex items-center gap-2 whitespace-nowrap text-tape-ink">
          <span aria-hidden className="live-dot" />
          <span>The wire</span>
        </span>
        <div className="hidden min-w-0 sm:block" data-tape-line>
          {row && (
            <Link href={`/news/${row.slug}`} className="flex min-w-0 items-center gap-3 text-[12.5px] hover:underline">
              <span className="min-w-0 truncate">{row.title}</span>
              <span className="num shrink-0 font-mono text-[11px] text-tape-ink/70">{hhmm(row.at)} UTC</span>
              <span className="label shrink-0 text-tape-ink/70">{row.kev ? "KEV" : row.category.slice(0, 4)}</span>
            </Link>
          )}
        </div>
        <UtcClock className="justify-self-end text-tape-ink/90" seconds fallbackIso={serverIso} />
      </div>
    </div>
  );
}

export function Nameplate({ total, last24h, serverIso }: { total: number; last24h: { at: string; kev: boolean }[]; serverIso: string }) {
  return (
    <header className="sheet pt-3 sm:pt-4">
      <div className="m-rule rule-2" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 sm:py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex items-center gap-2">
            <EditionNo total={total} className="label text-ink" />
            <span data-late-tag className="stamp" aria-hidden>
              Late
            </span>
          </span>
          <TodayLine serverIso={serverIso} className="label text-ink-3 sm:text-ink" />
        </div>
        <Wordmark mark="size-7 sm:size-8" text="text-[1.5rem] sm:text-[1.9rem]" />
        <div className="hidden items-center justify-end gap-4 md:flex">
          <span className="label text-right text-ink-3">{dialCaption(last24h)}</span>
          <Dial last24h={last24h} size={64} />
        </div>
        <span className="label justify-self-end text-right text-ink-3 md:hidden">{dialCaption(last24h)}</span>
      </div>
      <div className="m-rule rule" style={{ animationDelay: "0.1s" }} />
      <nav aria-label="Sections" className="flex items-center justify-between gap-4 overflow-x-clip py-2.5">
        <ul className="flex items-center gap-5 overflow-x-auto">
          {NAV.map((n) => (
            <li key={n.href} className={n.phone ? "" : "hidden sm:block"}>
              <SiteNavLink href={n.href}>{n.label}</SiteNavLink>
            </li>
          ))}
        </ul>
        <ul className="flex items-center gap-4">
          <li className="hidden sm:block">
            <a href={LINKS.rss} className="label text-ink-3 transition-colors hover:text-ink">
              RSS
            </a>
          </li>
          <li className="hidden sm:block">
            <a href={LINKS.jsonFeed} className="label text-ink-3 transition-colors hover:text-ink">
              JSON
            </a>
          </li>
          <li>
            <a href={LINKS.telegram} target="_blank" rel="noopener noreferrer" className="label text-ink transition-colors hover:text-ink-2">
              Telegram ↗
            </a>
          </li>
          <li>
            <EditionToggle />
          </li>
        </ul>
      </nav>
      <div className="m-rule rule-2" style={{ animationDelay: "0.2s" }} />
    </header>
  );
}

// The compact strip: wordmark, sections, the clock. Section line beneath on
// inner pages ("SECTION B · ADVERSARIES") so a reader always knows the page.
export function Strip({ section, sticky = false, total }: { section?: string; sticky?: boolean; total?: number }) {
  return (
    <div className={`border-b border-ink bg-paper ${sticky ? "" : "sticky top-0 z-40"}`}>
      <div className="sheet flex h-12 items-center justify-between gap-4 overflow-x-clip">
        <span className="flex shrink-0 items-center gap-3">
          <Wordmark mark="size-5" text="text-[1.125rem]" />
          {typeof total === "number" && total > 0 && <EditionNo total={total} className="label hidden text-ink-3 sm:inline" />}
        </span>
        <nav aria-label="Sections" className="flex min-w-0 items-center gap-4 overflow-x-auto sm:gap-5">
          {NAV.map((n) => (
            <span key={n.href} className={n.phone ? "" : "hidden sm:inline"}>
              <SiteNavLink href={n.href}>{n.label}</SiteNavLink>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">
            <UtcClock className="text-ink-3" />
          </span>
          <a href={LINKS.telegram} target="_blank" rel="noopener noreferrer" className="label hidden text-ink transition-colors hover:text-ink-2 sm:inline">
            Telegram ↗
          </a>
          {/* The toggle's own display class would beat a `hidden` on it, so the wrapper hides it on phones. */}
          <span className="hidden md:inline">
            <EditionToggle />
          </span>
        </div>
      </div>
      {section && (
        <div className="border-t border-rule-soft">
          <div className="sheet flex h-7 items-center justify-between gap-4">
            <span className="label min-w-0 truncate text-ink-3">{section}</span>
            <span className="shrink-0 md:hidden">
              <EditionToggle />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Inner pages: the strip, sticky, with its section line.
export function SiteHeader({ section }: { section?: string }) {
  return <Strip section={section} />;
}

// The front page: tape, nameplate, and the strip that arrives on scroll.
export function FrontMasthead({
  total,
  tapeRow,
  last24h,
  serverIso,
}: {
  total: number;
  tapeRow: WireRow | null;
  last24h: { at: string; kev: boolean }[];
  serverIso: string;
}) {
  return (
    <>
      <Tape row={tapeRow} serverIso={serverIso} />
      <Nameplate total={total} last24h={last24h} serverIso={serverIso} />
      <StickyStrip>
        <Strip sticky total={total} />
      </StickyStrip>
    </>
  );
}

export { GlyphChip };
