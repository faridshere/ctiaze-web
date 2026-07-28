"use client";

import { useEffect, useMemo, useState } from "react";
import { IOC_TYPE_LABEL, type Ioc, type IocType } from "@/lib/ioc";

type EnrichIoc = {
  type: IocType;
  value: string;
  defanged: string;
  source: "TweetFeed" | "ThreatFox";
  firstSeen?: string;
  tags?: string[];
  ref?: string;
  malware?: string;
  confidence?: number;
};

// Bottom-of-story indicators block. Shows IOCs pulled from the story text and,
// when the story names a malware family or actor, live indicators currently
// seen in the wild for that threat (via /api/ioc-enrich).
export function IocPanel({
  extracted,
  pivots,
}: {
  extracted: Ioc[];
  pivots: string[];
}) {
  const query = pivots.join(",");
  const [live, setLive] = useState<EnrichIoc[] | null>(null);
  const [matched, setMatched] = useState<{ term: string; generic: boolean } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    query ? "loading" : "idle"
  );

  useEffect(() => {
    if (!query) return;
    // Initial state is already "loading" when a term is present (see useState),
    // so no synchronous setState here — the effect only resolves it.
    let cancelled = false;
    fetch(`/api/ioc-enrich?term=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { iocs?: EnrichIoc[]; term?: string; generic?: boolean }) => {
        if (cancelled) return;
        setLive(d.iocs ?? []);
        setMatched({ term: d.term ?? pivots[0], generic: Boolean(d.generic) });
        setState("done");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasAnything =
    extracted.length > 0 || (live && live.length > 0) || state === "loading";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
          İndikatorlar · IOC
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          müdafiə üçün · defanged
        </span>
      </div>

      {!hasAnything && (
        <p className="mt-4 font-mono text-[13px] text-ink-muted">
          Bu dispaçda maşınla oxunan indikator aşkarlanmadı.
        </p>
      )}

      {extracted.length > 0 && (
        <ExtractedGroups iocs={extracted} />
      )}

      {query && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
            </span>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
              {matched?.generic
                ? `Aktiv ${matched.term} indikatorları · canlı`
                : `Aktiv əlaqəli IOC-lar${matched ? ` · ${matched.term}` : ""} · canlı`}
            </h3>
          </div>
          {matched?.generic && live && live.length > 0 && (
            <p className="mt-1 font-mono text-[10px] text-ink-muted">
              bu təhdid növü üzrə hazırda təpədə görünən indikatorlar (ümumi lent)
            </p>
          )}

          {state === "loading" && (
            <p className="mt-3 font-mono text-[12px] text-ink-muted animate-pulse">
              canlı təhdid lentindən yüklənir…
            </p>
          )}
          {state === "error" && (
            <p className="mt-3 font-mono text-[12px] text-ink-muted">
              Canlı lent hazırda əlçatan deyil.
            </p>
          )}
          {state === "done" && live && live.length === 0 && (
            <p className="mt-3 font-mono text-[12px] text-ink-muted">
              Hazırda açıq təhdid lentində uyğun indikator tapılmadı.
            </p>
          )}
          {live && live.length > 0 && <LiveList iocs={live} />}
        </div>
      )}
    </div>
  );
}

function ExtractedGroups({ iocs }: { iocs: Ioc[] }) {
  const groups = useMemo(() => {
    const m = new Map<IocType, Ioc[]>();
    for (const i of iocs) {
      const arr = m.get(i.type) ?? [];
      arr.push(i);
      m.set(i.type, arr);
    }
    return [...m.entries()];
  }, [iocs]);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
          Bu xəbərdən çıxarılan · {iocs.length}
        </span>
        <CopyAll values={iocs.map((i) => i.value)} />
      </div>
      <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-raised">
        {groups.map(([type, list]) => (
          <div key={type} className="flex gap-3 p-3">
            <span className="w-16 shrink-0 pt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              {IOC_TYPE_LABEL[type]}
            </span>
            <div className="flex flex-1 flex-col gap-1.5">
              {list.map((i) => (
                <IocRow key={i.value} defanged={i.defanged} value={i.value} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveList({ iocs }: { iocs: EnrichIoc[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? iocs : iocs.slice(0, 20);
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-end">
        <CopyAll values={iocs.map((i) => i.value)} />
      </div>
      <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-raised">
        {shown.map((i, idx) => (
          <div key={`${i.value}-${idx}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
            <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              {IOC_TYPE_LABEL[i.type]}
            </span>
            <div className="min-w-0 flex-1">
              <IocRow defanged={i.defanged} value={i.value} />
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-ink-muted">
              {i.malware && <span className="text-ink-secondary">{i.malware}</span>}
              {typeof i.confidence === "number" && <span>{i.confidence}%</span>}
              {i.firstSeen && <span>{i.firstSeen.slice(0, 10)}</span>}
              {i.ref ? (
                <a href={i.ref} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  {i.source} ↗
                </a>
              ) : (
                <span className="text-brand/70">{i.source}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {iocs.length > 20 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 font-mono text-[11px] uppercase tracking-wider text-brand hover:underline"
        >
          {expanded ? "daha az göstər" : `+${iocs.length - 20} daha göstər`}
        </button>
      )}
    </div>
  );
}

function IocRow({ defanged, value }: { defanged: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  };
  return (
    <div className="group flex items-center gap-2">
      <code className="break-all font-mono text-[12.5px] text-ink-primary">{defanged}</code>
      <button
        onClick={copy}
        aria-label="Kopyala"
        className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-muted opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
      >
        {copied ? "✓" : "kopyala"}
      </button>
    </div>
  );
}

function CopyAll({ values }: { values: string[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText([...new Set(values)].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={copy}
      className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-brand"
    >
      {copied ? "✓ kopyalandı" : "hamısını kopyala"}
    </button>
  );
}
