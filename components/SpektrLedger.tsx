"use client";

import { useEffect, useMemo, useState } from "react";
import { SpektrStrip, EMPTY_ACTIVE, type SpektrActive } from "./SpektrStrip";
import { LedgerRow } from "./LedgerRow";
import { DateDivider } from "./DateDivider";
import { formatDayDivider, bakuDayKey } from "@/lib/format";
import { normalizeCategory } from "@/lib/taxonomy";
import { useLocale } from "./locale";
import { getDict } from "@/lib/i18n";
import type { Story } from "@/lib/types";

// The home ledger: SpektrStrip (filter) + the filtered, day-grouped feed. Filter
// state is local useState so the page stays statically SSR-rendered (the full
// unfiltered ledger ships in the HTML — good for SEO and first paint); a mount
// effect reads /?kat=&bayraq= for deep links, and changes sync back via
// history.replaceState (no navigation, no useSearchParams de-opt).
function parse(search: string): SpektrActive {
  const p = new URLSearchParams(search);
  const kat = p.get("kat");
  const flags = (p.get("bayraq") || "").split(",");
  return {
    cat: kat ? normalizeCategory(kat) : null,
    kev: flags.includes("kev"),
    cve: flags.includes("cve"),
    az: flags.includes("az"),
  };
}

function toQuery(a: SpektrActive): string {
  const p = new URLSearchParams();
  if (a.cat) p.set("kat", a.cat);
  const flags = [a.kev && "kev", a.cve && "cve", a.az && "az"].filter(Boolean) as string[];
  if (flags.length) p.set("bayraq", flags.join(","));
  return p.toString();
}

export function SpektrLedger({
  stories,
  rail,
}: {
  stories: Story[];
  rail?: React.ReactNode;
}) {
  const locale = useLocale();
  const t = getDict(locale).feed;
  const [active, setActive] = useState<SpektrActive>(EMPTY_ACTIVE);

  // Hydrate filter from the URL on mount (deep links like /?kat=vuln land
  // pre-filtered). This MUST be an effect, not a lazy initializer: the server
  // renders the unfiltered ledger (good for SEO/first paint), so reading
  // window.location during the initial client render would hydration-mismatch.
  useEffect(() => {
    const a = parse(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-mount deep-link hydration; see comment above
    if (a.cat || a.kev || a.cve || a.az) setActive(a);
  }, []);

  const onChange = (next: SpektrActive) => {
    setActive(next);
    const qs = toQuery(next);
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  const anyFilter = active.cat !== null || active.kev || active.cve || active.az;

  const filtered = useMemo(
    () =>
      stories.filter((s) => {
        if (active.cat && normalizeCategory(s.category) !== active.cat) return false;
        if (active.kev && !s.kev) return false;
        if (active.cve && s.cveIds.length === 0) return false;
        if (active.az && !s.region) return false;
        return true;
      }),
    [stories, active.cat, active.kev, active.cve, active.az]
  );

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Story[] }[] = [];
    for (const s of filtered) {
      const key = bakuDayKey(s.publishedAt);
      let g = out.find((x) => x.key === key);
      if (!g) {
        g = { key, label: formatDayDivider(s.publishedAt, locale), items: [] };
        out.push(g);
      }
      g.items.push(s);
    }
    return out;
  }, [filtered, locale]);

  let rowIndex = 0;
  return (
    <div>
      {/* Spektr strip — full container width, above the grid */}
      <div className="border-b border-hairline pb-[var(--sp-row)] pt-[var(--sp-row)]">
        <SpektrStrip
          stories={stories}
          variant="full"
          active={active}
          onChange={onChange}
          shown={filtered.length}
        />
      </div>

      {/* ledger (left) + Diqqət rail (right) */}
      <div className="grid grid-cols-1 gap-x-[clamp(2rem,4vw,3rem)] gap-y-10 min-[1100px]:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <p className="py-16 font-mono text-[length:var(--t-meta)] text-ink-muted">
              {t.filterEmpty}
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.key}>
                <DateDivider label={g.label} />
                <div>
                  {g.items.map((s) => {
                    const display = !anyFilter && rowIndex++ === 0;
                    return <LedgerRow key={s.id} story={s} display={display} />;
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {rail && (
          <aside className="min-[1100px]:sticky min-[1100px]:top-[calc(3rem+1rem)] min-[1100px]:self-start">
            {rail}
          </aside>
        )}
      </div>
    </div>
  );
}
