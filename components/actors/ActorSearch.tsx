"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IndexEntry, OriginGroup } from "@/lib/threatactors";

type TypeFilter = "" | "nation-state" | "crime";

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "nation-state", label: "State-sponsored" },
  { value: "crime", label: "Crime" },
];

const TYPE_WORD: Record<string, string> = { "nation-state": "State-sponsored", crime: "Crime" };

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
//
// Set as an index line: the query on a 2px ink rule, the origin select on the
// same rule beside it, the type filters as label-voice toggles underlined in
// ink when active, and the results as ruled rows with the name in the slab,
// aliases in the body face and only the match count in mono.
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

  // ISO → country name for the ten listed origins; anything else prints its code.
  const originName = useMemo(() => new Map(origins.map((o) => [o.iso, o.name])), [origins]);

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

  const matched = useMemo(() => {
    if (!actors) return 0;
    const q = query.trim().toLowerCase();
    return actors.filter((a) => rankOf(a, q) >= 0 && (!type || a.type === type) && (!origin || a.origin === origin)).length;
  }, [actors, query, type, origin]);

  return (
    <div ref={rootRef} className="scroll-mt-24">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-end">
        <label className="block min-w-0">
          <span className="label block text-ink-3">Search the roster</span>
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
            className="ruled-input mt-1 text-[16px]"
          />
        </label>
        <label className="block min-w-0">
          <span className="label block text-ink-3">Assessed origin</span>
          <span className="relative block">
          <select
            value={origin}
            onFocus={load}
            onChange={(e) => setOrigin(e.target.value)}
            // Words, not figures: the label face on the same 2px rule as the
            // query (.ruled-input sets mono, so the face is set inline).
            style={{ fontFamily: "var(--font-body)", fontStretch: "75%", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.12em" }}
            className="ruled-input mt-1 cursor-pointer appearance-none pr-6 uppercase"
          >
            <option value="">All origins</option>
            {origins.map((o) => (
              <option key={o.iso} value={o.iso}>
                {o.name}
              </option>
            ))}
            {/* a ?origin= that is not one of the ten listed still reads back */}
            {origin && !originName.has(origin) && <option value={origin}>{origin}</option>}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[12px] text-ink-3">↓</span>
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-rule-soft">
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
              className={`label -mb-px border-b-2 pb-2 transition-colors ${active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
            >
              {c.label}
            </button>
          );
        })}
        {actors !== null && !loading && (
          <span className="label ml-auto pb-2 text-ink-3">
            <span className="num font-mono tracking-normal">{matched.toLocaleString("en-US")}</span> {matched === 1 ? "match" : "matches"}
            {matched > MAX_RESULTS ? (
              <>
                {" "}· first <span className="num font-mono tracking-normal">{MAX_RESULTS}</span> shown
              </>
            ) : null}
          </span>
        )}
      </div>

      {loading && <p className="label py-5 text-ink-3">loading roster…</p>}

      {!loading &&
        actors !== null &&
        (results.length > 0 ? (
          <ol>
            {results.map((a, i) => {
              const typeWord = TYPE_WORD[a.type] ?? null;
              const originLabel = a.origin ? (originName.get(a.origin) ?? a.origin) : null;
              return (
                <li key={a.id} className="row">
                  <Link
                    ref={i === 0 ? firstResultRef : undefined}
                    href={`/actors/${a.id}`}
                    className="grid grid-cols-1 items-baseline gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                  >
                    <span className="pressed block truncate text-[22px] leading-tight text-ink">{a.name}</span>
                    <span className="truncate text-[13px] text-ink-3">{a.aliases.slice(0, 3).join(" · ")}</span>
                    <span className="label text-ink-3 sm:text-right">
                      {typeWord}
                      {typeWord && originLabel ? " · " : ""}
                      {originLabel ? `assessed origin ${originLabel}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="label py-5 text-ink-3">nothing stated for that — try an alias or a country</p>
        ))}
    </div>
  );
}
