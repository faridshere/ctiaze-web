"use client";

import { useState } from "react";
import type { IndexEntry } from "@/lib/threatactors";

// One letter of the A–Z roster on /actors (2026-10-10). The names used to be
// pre-rendered into every letter's <ul>, which put the whole ~1,400-name
// roster in the page twice: once in the HTML and once more in the RSC payload
// (~180 KB each, 739 KB for the page). Now each closed <details> carries only
// its letter and count, and the names arrive from the static /actors/index.json
// (the file ActorSearch already uses; one fetch per visit, shared) the first
// time a visitor opens a letter. Discovery for crawlers is the sitemap's job.
// Plain anchors, not <Link>: a <Link> per dossier would prefetch hundreds of
// on-demand ISR renders as a visitor scrolls.
let roster: Promise<IndexEntry[]> | null = null;
function loadRoster(): Promise<IndexEntry[]> {
  roster ??= fetch("/actors/index.json")
    .then((r) => (r.ok ? r.json() : { actors: [] }))
    .then((d: { actors?: IndexEntry[] }) => d.actors ?? [])
    .catch(() => {
      roster = null; // let the next open retry
      return [];
    });
  return roster;
}

export function letterOf(name: string): string {
  const ch = name[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(ch) ? ch : "#";
}

export function RosterLetter({ letter, count }: { letter: string; count: number }) {
  const [rows, setRows] = useState<IndexEntry[] | null>(null);

  function onToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!e.currentTarget.open || rows !== null) return;
    loadRoster().then((all) => setRows(all.filter((a) => letterOf(a.name) === letter)));
  }

  return (
    <details id={`actor-${letter === "#" ? "num" : letter}`} className="group scroll-mt-24 border-b border-hairline" onToggle={onToggle}>
      <summary className="flex cursor-pointer list-none items-baseline gap-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:text-ink-primary [&::-webkit-details-marker]:hidden">
        <span className="text-ink-primary">{letter}</span>
        <span aria-hidden className="h-px flex-1 bg-hairline" />
        <span className="font-normal normal-case tracking-normal text-ink-muted">{count}</span>
        <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-90">→</span>
      </summary>
      {rows === null ? (
        <p className="pb-5 font-mono text-[11px] text-ink-muted">loading…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-5 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((a) => (
            <li key={a.id} className="min-w-0">
              <a href={`/actors/${encodeURIComponent(a.id)}`} className="roster-link" title={a.name}>
                {a.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
