"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActorSigil } from "@/components/actors/ActorSigil";
import type { IndexEntry, OriginGroup } from "@/lib/threatactors";

type TypeFilter = "" | "nation-state" | "crime";

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "nation-state", label: "State-sponsored" },
  { value: "crime", label: "Crime" },
];

const MAX_RESULTS = 30;

// name-prefix beats name-contains beats alias-contains; -1 means no match at all.
function rankOf(entry: IndexEntry, q: string): number {
  if (!q) return 0;
  const name = entry.name.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (entry.aliases.some((a) => a.toLowerCase().includes(q))) return 2;
  return -1;
}

// Read once, at first render, off window.location.search — never
// useSearchParams (that would ask this static page to bail into dynamic
// rendering). Guarded for the server pass (no window) so hydration never has
// to correct a setState-in-effect flash; a real URL value only ever appears
// once this runs again in the browser.
function initialOriginFromUrl(): string {
  if (typeof window === "undefined") return "";
  return (new URLSearchParams(window.location.search).get("origin") || "").toUpperCase();
}

// The whole roster's search — a few hundred rows, fetched ONCE from the static
// /actors/index.json (not a server function per keystroke) on the visitor's
// first interaction, then filtered entirely in the browser. Supports a
// starting `?origin=` (a click in from OriginStrip) by seeding state from the
// URL and scrolling itself into view on mount.
export function ActorSearch({ origins }: { origins: OriginGroup[] }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstResultRef = useRef<HTMLAnchorElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [actors, setActors] = useState<IndexEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("");
  const [origin, setOrigin] = useState(initialOriginFromUrl);

  function load() {
    if (actors !== null || loading) return;
    setLoading(true);
    fetch("/actors/index.json")
      .then((r) => r.json())
      .then((data: { actors?: IndexEntry[] }) => setActors(data.actors ?? []))
      .catch(() => setActors([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!origin) return;
    rootRef.current?.scrollIntoView({ block: "start" });
    // Deferred a tick so the fetch's setState calls land in their own task,
    // not synchronously inside this effect's commit (the thing the
    // react-hooks/set-state-in-effect rule is guarding against).
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
    // Fires once for the origin the URL loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => {
    if (!actors) return [];
    const q = query.trim().toLowerCase();
    return actors
      .map((a) => ({ a, rank: rankOf(a, q) }))
      .filter(({ a, rank }) => rank >= 0 && (!type || a.type === type) && (!origin || a.origin === origin))
      .sort((x, y) => x.rank - y.rank || x.a.name.localeCompare(y.a.name))
      .slice(0, MAX_RESULTS)
      .map(({ a }) => a);
  }, [actors, query, type, origin]);

  return (
    <div ref={rootRef} className="scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex-1">
          <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">Search adversaries</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={load}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                firstResultRef.current?.focus();
              }
            }}
            placeholder="APT28, Lazarus, Qilin, FANCY BEAR…"
            autoComplete="off"
            spellCheck={false}
            className="mt-2 h-12 w-full rounded-[var(--radius-btn)] border border-hairline bg-surface px-4 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
        <label className="shrink-0">
          <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">Origin</span>
          <select
            value={origin}
            onFocus={load}
            onChange={(e) => setOrigin(e.target.value)}
            className="mt-2 h-12 w-full rounded-[var(--radius-btn)] border border-hairline bg-surface px-3 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-primary focus:border-brand focus:outline-none sm:w-auto"
          >
            <option value="">All origins</option>
            {origins.map((o) => (
              <option key={o.iso} value={o.iso}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TYPE_CHIPS.map((c) => {
          const active = type === c.value;
          return (
            <button
              key={c.value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => {
                load();
                setType(c.value);
              }}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                active ? "border-brand bg-brand-wash text-brand" : "border-hairline text-ink-secondary hover:border-ink-muted hover:text-ink-primary"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">loading roster…</p>}

      {!loading && actors !== null && (
        results.length > 0 ? (
          <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
            {results.map((a, i) => (
              <li key={a.id}>
                <Link
                  ref={i === 0 ? firstResultRef : undefined}
                  href={`/actors/${a.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 transition-colors hover:bg-surface-hover"
                >
                  <ActorSigil a={{ _id: a.id, type: a.type, techniques: Array.from({ length: 0 }) }} size={28} />
                  <span className="min-w-0">
                    <span className="text-[14px] text-ink-primary transition-colors group-hover:text-brand">{a.name}</span>
                    {a.aliases.slice(0, 2).map((al) => (
                      <span key={al} className="ml-2 font-mono text-[10.5px] text-ink-muted">
                        {al}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-muted">
                    {a.type !== "unknown" ? a.type : null}
                    {a.type !== "unknown" && a.origin ? " · " : null}
                    {a.origin}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            nothing stated for that — try an alias or a country
          </p>
        )
      )}
    </div>
  );
}
