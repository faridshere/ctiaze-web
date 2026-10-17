"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ActorSigil } from "@/components/actors/ActorSigil";
import type { ActorRow } from "@/lib/threatactors";

// "Leading adversaries" as a ledger: a real <table> with 1px rules, a label
// head that stays put under the masthead strip while the ledger scrolls, and
// client-side sorting on the columns a reader would sort a ledger by. The
// rows arrive ranked by documentation depth (lib/threatactors.ts) and that
// order is the default; sorting never touches the URL, so the page stays
// static. `a.type === "unknown"` prints nothing rather than the word.
// Mono is for figures and ids only (counts, the MITRE id); aliases are names
// and set in the body face.
const TYPE_WORD: Record<string, string> = { "nation-state": "State-sponsored", crime: "Crime" };

// The sigil is a one-ink mark on this page. ActorSigil (the dossier's file)
// colours its accent node by type — stamp red for a nation-state — and the
// paper reserves that red for KEV; type is already a column. Overriding the
// two variables the sigil reads, on its wrapper only, keeps it in the third
// ink without touching the shared component.
const SIGIL_ONE_INK = { "--stamp": "currentColor", "--ink-2": "currentColor" } as React.CSSProperties;

type SortKey = "rank" | "name" | "type" | "origin" | "techniques" | "victims" | "mitre";
type Dir = "asc" | "desc";

const COLS: { key: SortKey; label: string; align: "left" | "right"; hide?: string; numeric?: boolean }[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "type", label: "Type", align: "left", hide: "hidden md:table-cell" },
  { key: "origin", label: "Assessed origin", align: "left", hide: "hidden md:table-cell" },
  { key: "techniques", label: "Techniques", align: "right", numeric: true },
  { key: "victims", label: "Victims", align: "right", hide: "hidden md:table-cell", numeric: true },
  { key: "mitre", label: "MITRE", align: "left", hide: "hidden lg:table-cell" },
];

function cmp(a: ActorRow, b: ActorRow, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, "en");
    case "type":
      return (TYPE_WORD[a.type] ?? "~").localeCompare(TYPE_WORD[b.type] ?? "~", "en");
    case "origin":
      return (a.originLabel ?? "~").localeCompare(b.originLabel ?? "~", "en");
    case "techniques":
      return a.techniqueCount - b.techniqueCount;
    case "victims":
      return a.victims - b.victims;
    case "mitre":
      return (a.mitre ?? "~").localeCompare(b.mitre ?? "~", "en");
    default:
      return 0;
  }
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

// One line of the ledger. Exported on its own so a caller can still print a
// single adversary in the ledger's voice.
export function ActorLedgerRow({ a, i = 0 }: { a: ActorRow; i?: number }) {
  const typeWord = TYPE_WORD[a.type] ?? null;
  return (
    <tr className="border-b border-rule-soft align-top" data-i={i}>
      <th scope="row" className="py-3 pr-4 text-left font-normal">
        <Link href={`/actors/${a.id}`} className="group flex items-start gap-3 text-ink">
          <span className="mt-0.5 shrink-0 text-ink-3" aria-hidden style={SIGIL_ONE_INK}>
            <ActorSigil a={{ _id: a.id, type: a.type, techniques: Array.from({ length: Math.min(a.techniqueCount, 9) }) }} size={22} />
          </span>
          <span className="min-w-0">
            <span className="pressed block text-[22px] leading-[1.05] sm:text-[24px]">{a.name}</span>
            {a.aliases.length > 0 && (
              // Names, not figures: the body face. One line on the phone, where
              // the row is already carrying the folded columns underneath.
              <span className="mt-1 line-clamp-1 text-[13px] leading-snug text-ink-3 md:line-clamp-none">
                {a.aliases.slice(0, 3).join(" · ")}
              </span>
            )}
            {/* Under 768px the type, origin and victims columns fold into the
                name cell as one label line. The column head "assessed origin"
                is off-screen there, so the country stands on its own. */}
            <span className="label mt-1.5 block text-ink-3 md:hidden">
              {[typeWord, a.originLabel, a.victims > 0 ? `${fmt(a.victims)} victims` : null]
                .filter((x): x is string => Boolean(x))
                .join(" · ")}
            </span>
          </span>
        </Link>
      </th>
      <td className="label hidden py-3.5 pr-4 text-ink-2 md:table-cell">{typeWord ?? ""}</td>
      <td className="label hidden py-3.5 pr-4 text-ink-2 md:table-cell">{a.originLabel ?? ""}</td>
      <td className="num py-3 pr-4 text-right font-mono text-[15px] text-ink">{a.techniqueCount > 0 ? fmt(a.techniqueCount) : ""}</td>
      <td className="num hidden py-3 pr-4 text-right font-mono text-[15px] text-ink md:table-cell">{a.victims > 0 ? fmt(a.victims) : ""}</td>
      <td className="num hidden py-3.5 font-mono text-[12px] text-ink-3 lg:table-cell">{a.mitre ?? ""}</td>
    </tr>
  );
}

export function ActorLedger({ rows }: { rows: ActorRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: "rank", dir: "desc" });

  const sorted = useMemo(() => {
    if (sort.key === "rank") return rows;
    const s = [...rows].sort((a, b) => cmp(a, b, sort.key) || a.name.localeCompare(b.name, "en"));
    return sort.dir === "desc" ? s.reverse() : s;
  }, [rows, sort]);

  function toggle(key: SortKey, numeric: boolean) {
    setSort((cur) => {
      if (cur.key !== key) return { key, dir: numeric ? "desc" : "asc" };
      // second click flips; third returns to the ranking
      if (cur.dir === (numeric ? "desc" : "asc")) return { key, dir: numeric ? "asc" : "desc" };
      return { key: "rank", dir: "desc" };
    });
  }

  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">Leading adversaries, ranked by documentation depth; sortable by column</caption>
      {/* --strip-h is declared on <main> by app/actors/page.tsx: the strip's height. */}
      <thead className="sticky top-[var(--strip-h)] z-10 bg-paper">
        <tr className="border-b border-ink">
          {COLS.map((c) => {
            const active = sort.key === c.key;
            const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
            return (
              <th
                key={c.key}
                scope="col"
                aria-sort={ariaSort}
                className={`py-2 pr-4 last:pr-0 ${c.align === "right" ? "text-right" : "text-left"} ${c.hide ?? ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(c.key, Boolean(c.numeric))}
                  className={`label inline-flex items-baseline gap-1 border-b-2 pb-0.5 transition-colors ${
                    active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"
                  }`}
                >
                  {c.label}
                  <span aria-hidden className="font-mono text-[10px]">
                    {active ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((a, i) => (
          <ActorLedgerRow key={a.id} a={a} i={i} />
        ))}
      </tbody>
    </table>
  );
}
