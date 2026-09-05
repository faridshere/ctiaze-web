"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STACK_PRODUCTS, productLabel, storyStack } from "@/lib/_disabled/stack";
import { useLocale } from "./locale";
import { getDict } from "@/lib/_disabled/i18n";
import type { Story } from "@/lib/types";

const KEY = "ctiaze.stack";

// Clipboard fallback for non-secure contexts / older browsers where the async
// Clipboard API is unavailable or blocked (mirrors IocPanel's copy discipline).
// Defined but never invoked during SSR — it only runs from an onClick handler.
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// "Mənim stekim" — a personal, client-only watchlist. Turns the global feed into
// "does anything today touch MY infrastructure?" — the daily-open question the
// AZ/region filters can't answer. Matching is deterministic (lib/stack.ts), so a
// hit is real; selection lives in localStorage (no account, nothing leaves the browser).
export function StackWatch({ stories }: { stories: Story[] }) {
  const locale = useLocale();
  const t = getDict(locale).stack;
  // One combined post-mount state so localStorage is read exactly once (SSR can't
  // read it, so a lazy initializer would hydration-mismatch — same pattern SpektrLedger uses).
  const [state, setState] = useState<{ mounted: boolean; sel: string[] }>({ mounted: false, sel: [] });
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { mounted, sel } = state;

  useEffect(() => {
    let saved: string[] = [];
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-mount localStorage hydration; SSR can't read localStorage
    setState({ mounted: true, sel: saved });
  }, []);

  function toggle(id: string) {
    setState((cur) => {
      const next = cur.sel.includes(id) ? cur.sel.filter((x) => x !== id) : [...cur.sel, id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return { ...cur, sel: next };
    });
  }

  // Build the reader's personal feed URL from their watched stack and copy the
  // absolute URL — the retention win: the watchlist follows them into their own
  // RSS reader / Slack / Teams, not just this page. The component tracks no KEV or
  // category filter, so only ?q= is composed (the RSS route AND-combines it with
  // ?kev/?region/?cat when a subscriber adds those by hand).
  async function copyFeed() {
    const url = `${window.location.origin}/rss.xml?q=${encodeURIComponent(sel.join(","))}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = legacyCopy(url); // non-secure context / clipboard blocked
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }

  if (!mounted) return null; // localStorage is client-only — render after mount to avoid hydration mismatch

  const selSet = new Set(sel);
  const matches = sel.length
    ? stories
        .map((s) => ({ s, hits: storyStack(s).filter((id) => selSet.has(id)) }))
        .filter((m) => m.hits.length > 0)
    : [];
  const showPicker = editing || sel.length === 0;

  return (
    <div className="rounded-md border border-hairline bg-surface-raised/40 p-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-brand">{t.title}</span>
        {sel.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={copyFeed}
              title={locale === "en" ? "Subscribe to your stack in any RSS reader / Slack / Teams" : "Öz stekini istənilən RSS oxuyucuda / Slack / Teams-də izlə"}
              className="font-mono text-[length:var(--t-micro)] text-ink-muted transition-colors hover:text-brand"
            >
              {copied ? (locale === "en" ? "✓ copied" : "✓ kopyalandı") : locale === "en" ? "Copy feed" : "Feed-i kopyala"}
            </button>
            <button
              onClick={() => setEditing((e) => !e)}
              className="font-mono text-[length:var(--t-micro)] text-ink-muted transition-colors hover:text-brand"
            >
              {editing ? t.done : t.edit}
            </button>
          </div>
        )}
      </div>

      {showPicker ? (
        <div className="mt-3">
          {sel.length === 0 && (
            <p className="text-[length:var(--t-meta)] leading-snug text-ink-secondary">{t.setupPrompt}</p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {STACK_PRODUCTS.map((p) => {
              const on = selSet.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] transition-colors ${on ? "border-brand/50 bg-brand-wash text-brand" : "border-hairline bg-surface text-ink-muted hover:text-ink-secondary"}`}
                >
                  {on ? "✓ " : ""}{p.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 font-mono text-[length:var(--t-micro)] text-ink-muted">{t.hint}</p>
        </div>
      ) : (
        <div className="mt-3" role="status">
          <div className="font-mono text-[length:var(--t-micro)] text-ink-secondary">
            {t.matchLine(matches.length, stories.length)}
          </div>
          {matches.length === 0 ? (
            <p className="mt-2 text-[length:var(--t-meta)] text-ink-muted">{t.none}</p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {matches.slice(0, 8).map(({ s, hits }) => {
                const title = locale === "en" ? s.titleEn : s.titleAz;
                return (
                  <li key={s.id}>
                    <Link href={`/news/${s.slug}`} className="group block">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {s.kev && (
                          <span className="rounded-sm border border-accent-critical/40 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-accent-critical">KEV</span>
                        )}
                        <span className="font-mono text-[length:var(--t-micro)] text-brand">{hits.map(productLabel).join(" · ")}</span>
                      </div>
                      <div className="mt-0.5 text-[length:var(--t-meta)] leading-snug text-ink-secondary transition-colors group-hover:text-ink-primary">
                        {title}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
