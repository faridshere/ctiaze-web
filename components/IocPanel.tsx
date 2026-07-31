"use client";

import { useMemo, useState } from "react";
import { IOC_TYPE_LABEL, type Ioc, type IocType } from "@/lib/ioc";

type Rep = { malware: string; threatType: string; confidence: number };
type ExtractedIoc = Ioc & { rep?: Rep | null };

// The named threat's live infra, resolved server-side from the keyless ThreatFox
// export (reliable — no client fetch, no loading/empty flicker).
type FamilyIoc = {
  kind: "ip" | "domain" | "url" | "hash";
  ioc: string;
  malware: string;
  threatType: string;
  confidence: number;
  firstSeen: string | null;
  reference: string | null;
  port: number | null;
};

const THREAT_LABEL: Record<string, string> = {
  botnet_cc: "Botnet C2",
  payload_delivery: "Yük çatdırılması",
  payload: "Zərərli yük",
  malware_download: "Malware endirmə",
};
const KIND_LABEL: Record<FamilyIoc["kind"], string> = {
  ip: "IP", domain: "Domen", url: "URL", hash: "Hash",
};

function defangFamily(kind: FamilyIoc["kind"], v: string): string {
  if (kind === "hash") return v;
  const d = v.replace(/\./g, "[.]");
  return kind === "url" ? d.replace(/^http/i, "hxxp") : d;
}

// Bottom-of-story indicators block. Two clearly-separated, honest things:
//   1. "Bu xəbərdən çıxarılan" — indicators lifted from THIS article's own text,
//      each cross-checked against ThreatFox (a "zərərli · <family>" badge when the
//      article's own IOC is known-malicious). Enrichment tied to the news.
//   2. "<family> — aktiv infrastruktur" — ONLY when the article names a specific
//      malware family ThreatFox tracks: that family's real active indicators,
//      explicitly labelled as threat-context (not this article's own IOCs).
export function IocPanel({
  extracted,
  familyName,
  familyIocs,
}: {
  extracted: ExtractedIoc[];
  familyName: string;
  familyIocs: FamilyIoc[];
}) {
  const hasExtracted = extracted.length > 0;
  const hasFamily = familyIocs.length > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.16em] text-brand">
          İndikatorlar · IOC
        </h2>
        <span className="font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-ink-muted">
          müdafiə üçün · defanged
        </span>
      </div>

      {!hasExtracted && !hasFamily && (
        <p className="mt-4 font-mono text-[length:var(--t-meta)] text-ink-muted">
          Bu dispaçda maşınla oxunan indikator aşkarlanmadı. Aktiv təhdid göstəriciləri üçün{" "}
          <a href="/ioc" className="text-brand hover:underline">
            IOC səhifəsi
          </a>
          .
        </p>
      )}

      {hasExtracted && <ExtractedGroups iocs={extracted} />}

      {hasFamily && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
            </span>
            <h3 className="font-mono text-[length:var(--t-meta)] uppercase tracking-[0.14em] text-ink-secondary">
              {familyName} — aktiv infrastruktur · canlı
            </h3>
            <span className="font-mono text-[length:var(--t-micro)] tabular-nums text-ink-muted">
              {familyIocs.length}
            </span>
          </div>
          <p className="mt-1 font-mono text-[length:var(--t-micro)] text-ink-muted">
            bu xəbərin adını çəkdiyi təhdidin hazırda abuse.ch-də aktiv göstəriciləri — xəbərə deyil, təhdidə aiddir
          </p>
          <FamilyList iocs={familyIocs} />
        </div>
      )}
    </div>
  );
}

function ExtractedGroups({ iocs }: { iocs: ExtractedIoc[] }) {
  const groups = useMemo(() => {
    const m = new Map<IocType, ExtractedIoc[]>();
    for (const i of iocs) {
      const arr = m.get(i.type) ?? [];
      arr.push(i);
      m.set(i.type, arr);
    }
    return [...m.entries()];
  }, [iocs]);
  const flagged = iocs.filter((i) => i.rep).length;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-secondary">
          Bu xəbərdən çıxarılan · {iocs.length}
          {flagged > 0 && <span className="ml-2 text-accent-critical">· {flagged} zərərli</span>}
        </span>
        <CopyAll values={iocs.map((i) => i.value)} />
      </div>
      <div className="divide-y divide-hairline rounded-[var(--radius-chip)] border border-hairline bg-surface-raised">
        {groups.map(([type, list]) => (
          <div key={type} className="flex gap-3 p-3">
            <span className="w-16 shrink-0 pt-0.5 font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-ink-muted">
              {IOC_TYPE_LABEL[type]}
            </span>
            <div className="flex flex-1 flex-col gap-1.5">
              {list.map((i) => (
                <div key={i.value} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <IocRow defanged={i.defanged} value={i.value} />
                  {i.rep && (
                    <span
                      className="rounded-[var(--radius-chip)] border border-accent-critical/50 px-1 font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-accent-critical"
                      title={`abuse.ch: ${i.rep.threatType} · ${i.rep.confidence}% əminlik`}
                    >
                      zərərli · {i.rep.malware}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FamilyList({ iocs }: { iocs: FamilyIoc[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? iocs : iocs.slice(0, 15);
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-end">
        <CopyAll values={iocs.map((i) => (i.port ? `${i.ioc}:${i.port}` : i.ioc))} />
      </div>
      <div className="divide-y divide-hairline rounded-[var(--radius-chip)] border border-hairline bg-surface-raised">
        {shown.map((i, idx) => (
          <div key={`${i.ioc}-${idx}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
            <span className="w-14 shrink-0 font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-ink-muted">
              {KIND_LABEL[i.kind]}
            </span>
            <div className="min-w-0 flex-1">
              <IocRow
                defanged={defangFamily(i.kind, i.ioc) + (i.port ? `:${i.port}` : "")}
                value={i.port ? `${i.ioc}:${i.port}` : i.ioc}
              />
            </div>
            <div className="flex items-center gap-2 font-mono text-[length:var(--t-micro)] text-ink-muted">
              {i.threatType && <span className="text-accent-serious">{THREAT_LABEL[i.threatType] || i.threatType}</span>}
              <span className="tabular-nums">{i.confidence}%</span>
              {i.firstSeen && <span>{i.firstSeen.slice(0, 10)}</span>}
              {i.reference && (
                <a href={i.reference} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  mənbə ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      {iocs.length > 15 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-brand hover:underline"
        >
          {expanded ? "daha az göstər" : `+${iocs.length - 15} daha göstər`}
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
      <code className="break-all font-mono text-[length:var(--t-meta)] text-ink-primary">{defanged}</code>
      <button
        onClick={copy}
        aria-label="Kopyala"
        className="shrink-0 font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-ink-muted opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
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
      className="font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-ink-muted hover:text-brand"
    >
      {copied ? "✓ kopyalandı" : "hamısını kopyala"}
    </button>
  );
}
