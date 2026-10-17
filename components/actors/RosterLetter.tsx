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
//
// Set as an index page: the letter head in the slab, the count in mono with
// its word in the label voice on a fixed-width cell so the row aligns down
// the list, one bottom rule per row (no leader), and the names flowing down
// newspaper columns once the letter is open.
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
    <details id={`actor-${letter === "#" ? "num" : letter}`} className="group row scroll-mt-32" onToggle={onToggle}>
      <summary className="flex cursor-pointer list-none items-baseline gap-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="headline w-[2ch] text-[26px] text-ink">{letter}</span>
        <span className="label w-[8.5rem] shrink-0 text-ink-3 transition-colors group-hover:text-ink">
          <span className="num font-mono tracking-normal">{count.toLocaleString("en-US")}</span> {count === 1 ? "dossier" : "dossiers"}
        </span>
        <span aria-hidden className="label ml-auto text-ink-3">
          <span className="group-open:hidden">Open ↓</span>
          <span className="hidden group-open:inline">Close ↑</span>
        </span>
      </summary>
      {rows === null ? (
        <p className="label pb-5 text-ink-3">loading…</p>
      ) : (
        <ul className="col-rules grid grid-cols-2 gap-x-6 gap-y-1 pb-5 [--cols:2] sm:grid-cols-3 md:[--cols:3] lg:grid-cols-4 lg:[--cols:4]">
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
