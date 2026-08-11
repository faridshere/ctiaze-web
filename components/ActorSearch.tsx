"use client";

import { useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";

type Hit = {
  id: string; name: string; aliases: string[]; type: string;
  origin_country: string | null; state_sponsor: string | null;
  targets_countries: string[]; targets_sectors: string[];
  description_az: string | null; description_en: string | null; source: string; refsCount: number; recentCount: number;
  recent: { title: string; url: string; date: string | null }[];
  match_reasons: string[]; match_score: number;
};
type SearchResponse = { query: string; count: number; results: Hit[] };

const TYPE_CHIP: Record<string, string> = {
  "nation-state": "border-accent-critical/40 bg-accent-critical/10 text-accent-critical",
  crime: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  unknown: "border-hairline bg-surface text-ink-muted",
};

export function ActorSearch({ locale }: { locale: Locale }) {
  const t = getDict(locale).actors;
  const c = getDict(locale).common;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");

  const typeLabel = (tp: string) => (tp === "unknown" ? t.nameleum : tp);

  async function run(term: string) {
    setError("");
    setData(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/actors?q=${encodeURIComponent(term)}`);
      const j = await r.json();
      if (!r.ok) setError(j.error || c.genericError);
      else setData(j as SearchResponse);
    } catch {
      setError(c.networkError);
    } finally {
      setLoading(false);
    }
  }

  const maxScore = data?.results.length ? Math.max(...data.results.map((h) => h.match_score)) : 1;

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-hairline bg-surface-raised/40">
        <div className="flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="size-2.5 rounded-full bg-accent-critical/80" />
            <i className="size-2.5 rounded-full bg-accent-warning/80" />
            <i className="size-2.5 rounded-full bg-accent-good/80" />
          </span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-muted">{t.consoleLabel}</span>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) run(q.trim()); }}
          className="flex flex-col gap-2 p-4 sm:flex-row"
        >
          <label className="relative flex flex-1 items-center">
            <span className="pointer-events-none absolute left-3.5 font-mono text-sm text-ink-muted">?</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              className="w-full rounded-sm border border-hairline bg-surface py-2.5 pl-8 pr-3.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="rounded-sm bg-brand px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "…" : c.search}
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 font-mono text-[11px] text-ink-muted">
          <span>{t.examples}</span>
          {t.searchExamples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setQ(ex); run(ex); }}
              className="rounded-sm border border-hairline bg-surface px-2 py-0.5 text-ink-secondary transition-colors hover:border-brand hover:text-ink-primary"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mt-5 font-mono text-xs text-ink-secondary">
          <span className="text-accent-good">●</span> {t.searching}
        </p>
      )}
      {error && <p className="mt-5 font-mono text-xs text-accent-critical">{error}</p>}

      {data && !loading && (
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">{t.resultFor(data.query)}</h2>
            <span className="h-px flex-1 bg-hairline" />
            <span className="font-mono text-[11px] text-ink-muted">{t.matchNote}</span>
          </div>

          {data.count === 0 ? (
            <p className="mt-4 rounded-md border border-hairline bg-surface-raised/40 px-4 py-3 text-[13.5px] leading-relaxed text-ink-secondary">
              {t.empty(data.query)}
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-3">
                {data.results.map((h) => (
                  <HitRow key={h.id} h={h} maxScore={maxScore} t={t} typeLabel={typeLabel} locale={locale} />
                ))}
              </div>
              <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-muted">{t.totalNote(data.count, data.query)}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type ActorsDict = ReturnType<typeof getDict>["actors"];

// searchActors returns English provenance prose; localize the known prefixes so
// the reason chips don't leak English into the AZ locale (the matched value —
// country/sector/alias — stays as stored). Falls through unchanged if unrecognized.
function localizeReason(r: string, t: ActorsDict): string {
  if (r === "name match") return t.rName;
  if (r.startsWith("alias match: ")) return `${t.rAlias}: ${r.slice(13)}`;
  if (r.startsWith("targets sector: ")) return `${t.rSector}: ${r.slice(16)}`;
  if (r.startsWith("targets: ")) return `${t.rTargets}: ${r.slice(9)}`;
  if (r.startsWith("recent activity mentions ")) return `${t.rRecent}: ${r.slice(25)}`;
  return r;
}

function HitRow({ h, maxScore, t, typeLabel, locale }: { h: Hit; maxScore: number; t: ActorsDict; typeLabel: (tp: string) => string; locale: Locale }) {
  const desc = locale === "en" ? h.description_en || h.description_az : h.description_az || h.description_en;
  return (
    <article className="grid grid-cols-1 gap-3 rounded-md border border-hairline bg-surface-raised/40 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-headline text-base font-semibold text-ink-primary">{h.name}</span>
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_CHIP[h.type] ?? TYPE_CHIP.unknown}`}>
            {typeLabel(h.type)}
          </span>
          {h.aliases.slice(0, 2).map((al) => (
            <span key={al} className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">{al}</span>
          ))}
        </div>
        {desc && <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{desc}</p>}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {h.match_reasons.map((r) => (
            <span key={r} className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${r.startsWith("recent activity") ? "border-hairline bg-surface text-ink-muted" : "border-brand/30 bg-brand-wash text-brand"}`}>
              {localizeReason(r, t)}
            </span>
          ))}
          {h.recentCount > 0 && (
            <span className="rounded-full border border-hairline bg-surface px-2 py-0.5 font-mono text-[11px] text-ink-muted">{t.recentActivity(h.recentCount)}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-left sm:min-w-[120px] sm:text-right">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">{t.matchScore}</div>
        <div className="mt-0.5 font-mono text-xl font-semibold text-ink-primary tabular-nums">{h.match_score}</div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(6, (h.match_score / maxScore) * 100)}%` }} />
        </div>
      </div>
    </article>
  );
}
