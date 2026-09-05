import Link from "next/link";
import { CtiazeMark } from "@/components/CtiazeMark";
import { LINKS } from "@/lib/site";
import { Button } from "./Button";
import { SiteNavLink } from "./SiteNavLink";

// Three zones, xintra-style: section links left, the mark dead-centre, the two
// actions right. Sticky over a hairline; the ground is the page surface at 88%
// with a blur so the globe shows through on the landing.
const NAV: { href: string; label: string; phone: boolean }[] = [
  { href: "/actors", label: "Adversaries", phone: true },
  { href: "/news", label: "Archive", phone: false },
  { href: "/about", label: "About", phone: false },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/[0.88] backdrop-blur-md">
      <div className="mx-auto grid h-14 max-w-[80rem] grid-cols-[1fr_auto_1fr] items-center px-[var(--sp-gutter)]">
        <nav aria-label="Sections" className="flex items-center gap-5">
          {NAV.map((n) => (
            <span key={n.href} className={n.phone ? "" : "hidden sm:inline"}>
              <SiteNavLink href={n.href}>{n.label}</SiteNavLink>
            </span>
          ))}
        </nav>

        <Link href="/" className="group flex items-center gap-2" aria-label="skopnix — home">
          <CtiazeMark className="size-[26px] text-ink-primary transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105" />
          <span className="font-display text-[1.15rem] font-semibold tracking-[-0.02em] text-ink-primary">
            skop<span className="text-brand">nix</span>
          </span>
        </Link>

        <div className="flex items-center justify-end gap-2.5">
          <a
            href={LINKS.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink-primary sm:inline"
          >
            Telegram <span aria-hidden>↗</span>
          </a>
          <Button href="/#access" size="sm">
            Early access
          </Button>
        </div>
      </div>
    </header>
  );
}
