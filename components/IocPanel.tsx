"use client";

import { useMemo, useState } from "react";
import { IOC_TYPE_LABEL, type Ioc, type IocType } from "@/lib/ioc";
import type { Locale } from "@/lib/locale";

const IOC_TYPE_LABEL_EN: Record<string, string> = {
  ipv4: "IPv4", ipv6: "IPv6", domain: "Domains", url: "URLs",
  sha256: "Hashes (SHA256)", sha1: "Hashes (SHA1)", md5: "Hashes (MD5)",
  email: "Emails", btc: "BTC addresses", eth: "ETH addresses", cve: "CVEs",
};

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
const THREAT_LABEL_EN: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Payload delivery",
  payload: "Payload", malware_download: "Malware download",
};
const KIND_LABEL: Record<FamilyIoc["kind"], string> = {
  ip: "IP", domain: "Domen", url: "URL", hash: "Hash",
};
const KIND_LABEL_EN: Record<FamilyIoc["kind"], string> = {
  ip: "IP", domain: "Domain", url: "URL", hash: "Hash",
};

function defangFamily(kind: FamilyIoc["kind"], v: string): string {
  if (kind === "hash") return v;
  const d = v.replace(/\./g, "[.]");
  return kind === "url" ? d.replace(/^http/i, "hxxp") : d;
}

// The indicators of the intel inset, as two ruled ledgers that are kept
// honestly apart:
//   1. "Extracted from this dispatch" — indicators lifted from THIS article's
//      own text, each cross-checked against ThreatFox (an ink stamp naming the
//      family when the article's own IOC is known-malicious).
//   2. "<family> · active infrastructure" — ONLY when the article names a
//      specific malware family ThreatFox tracks: that family's real active
//      indicators, labelled as threat context, not this article's own IOCs.
// The section label above (IntelInset) already says "Indicators · N ·
// defanged", so the panel prints no head of its own; the extracted ledger
// gets a sub-head only when the family ledger follows it and the two must be
// told apart, or when `headed` says another block shares the section.
export function IocPanel({
  extracted,
  familyName,
  familyIocs,
  locale = "en",
  headed = false,
}: {
  extracted: ExtractedIoc[];
  familyName: string;
  familyIocs: FamilyIoc[];
  /** Site is English-only; kept for components/_disabled, which may still pass "az". */
  locale?: Locale;
  /** another block (the adversary) shares the section, so this one needs its own sub-head */
  headed?: boolean;
}) {
  const en = locale === "en";
  const hasExtracted = extracted.length > 0;
  const hasFamily = familyIocs.length > 0;

  return (
    <div>
      {!hasExtracted && !hasFamily && (
        <p className="mt-3 font-mono text-[12px] text-ink-3">
          {/* The /ioc page is shelved under app/_disabled while the site runs
              lean — restore this pointer when it comes back. */}
          {en ? "No machine-readable indicators detected in this dispatch." : "Bu dispaçda maşınla oxunan indikator aşkarlanmadı."}
        </p>
      )}

      {hasExtracted && <ExtractedGroups iocs={extracted} locale={locale} headed={headed || hasFamily} />}

      {hasFamily && (
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h4 className="label text-ink">
              {familyName} · {en ? "active infrastructure" : "aktiv infrastruktur"}
              <span className="num ml-2 font-mono text-[11px] normal-case tracking-normal text-ink-3">{familyIocs.length}</span>
            </h4>
            <span className="label text-ink-3">{en ? "live · abuse.ch" : "canlı · abuse.ch"}</span>
          </div>
          <p className="mt-1 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-3">
            {en
              ? "The threat this dispatch names — its currently active indicators on abuse.ch. Tied to the threat, not to the dispatch."
              : "bu xəbərin adını çəkdiyi təhdidin hazırda abuse.ch-də aktiv göstəriciləri — xəbərə deyil, təhdidə aiddir"}
          </p>
          <FamilyList iocs={familyIocs} locale={locale} />
        </div>
      )}
    </div>
  );
}

function ExtractedGroups({ iocs, locale, headed }: { iocs: ExtractedIoc[]; locale: Locale; headed: boolean }) {
  const en = locale === "en";
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
    <div className={headed ? "mt-3" : ""}>
      {headed && (
        <div className="flex items-baseline justify-between gap-3 border-t border-ink pt-2 pb-1">
          <span className="label text-ink">
            {en ? "Extracted from this dispatch" : "Bu xəbərdən çıxarılan"} · {iocs.length}
            {flagged > 0 && (
              <span className="ml-2 text-ink-2">
                · {flagged} {en ? "known malicious" : "zərərli"}
              </span>
            )}
          </span>
          <CopyAll values={iocs.map((i) => i.value)} locale={locale} />
        </div>
      )}
      <dl className="divide-y divide-rule-soft">
        {groups.map(([type, list]) => (
          <div key={type} className="grid grid-cols-[5.5rem_1fr] gap-x-3 py-2.5">
            <dt className="label pt-0.5 text-ink-3">{en ? IOC_TYPE_LABEL_EN[type] || IOC_TYPE_LABEL[type] : IOC_TYPE_LABEL[type]}</dt>
            <dd className="flex min-w-0 flex-col gap-1.5">
              {list.map((i) => (
                <div key={i.value} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <IocRow defanged={i.defanged} value={i.value} locale={locale} />
                  {i.rep && (
                    <span
                      className="stamp stamp-ink"
                      title={`abuse.ch: ${i.rep.threatType} · ${i.rep.confidence}%${en ? " confidence" : " əminlik"}`}
                    >
                      {en ? "malicious" : "zərərli"} · {i.rep.malware}
                    </span>
                  )}
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {!headed && (
        <div className="flex items-center justify-between gap-3 border-t border-rule-soft pt-2">
          {flagged > 0 ? (
            <span className="label text-ink-2">
              {flagged} {en ? "known malicious" : "zərərli"}
            </span>
          ) : (
            <span />
          )}
          <CopyAll values={iocs.map((i) => i.value)} locale={locale} />
        </div>
      )}
    </div>
  );
}

function FamilyList({ iocs, locale }: { iocs: FamilyIoc[]; locale: Locale }) {
  const en = locale === "en";
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? iocs : iocs.slice(0, 15);
  return (
    <div className="mt-3">
      <div className="flex items-center justify-end border-t border-ink pt-2 pb-1">
        <CopyAll values={iocs.map((i) => (i.port ? `${i.ioc}:${i.port}` : i.ioc))} locale={locale} />
      </div>
      <ol className="divide-y divide-rule-soft">
        {shown.map((i, idx) => (
          <li key={`${i.ioc}-${idx}`} className="grid grid-cols-[3.5rem_1fr] gap-x-3 py-2.5 sm:grid-cols-[3.5rem_1fr_auto]">
            <span className="label pt-0.5 text-ink-3">{(en ? KIND_LABEL_EN : KIND_LABEL)[i.kind]}</span>
            <div className="min-w-0">
              <IocRow
                defanged={defangFamily(i.kind, i.ioc) + (i.port ? `:${i.port}` : "")}
                value={i.port ? `${i.ioc}:${i.port}` : i.ioc}
                locale={locale}
              />
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-x-3 font-mono text-[11px] text-ink-3 sm:col-start-3 sm:justify-end">
              {i.threatType && <span className="text-ink-2">{(en ? THREAT_LABEL_EN : THREAT_LABEL)[i.threatType] || i.threatType}</span>}
              <span className="num">{i.confidence}%</span>
              {i.firstSeen && <span className="num">{i.firstSeen.slice(0, 10)}</span>}
              {i.reference && (
                <a href={i.reference} target="_blank" rel="noopener noreferrer" className="ulink hover:text-ink">
                  {en ? "source" : "mənbə"} ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      {iocs.length > 15 && (
        <button onClick={() => setExpanded((v) => !v)} className="label ulink mt-3 text-ink-3 hover:text-ink">
          {expanded ? (en ? "Show fewer" : "daha az göstər") : `+${iocs.length - 15} ${en ? "more" : "daha göstər"}`}
        </button>
      )}
    </div>
  );
}

function IocRow({ defanged, value, locale }: { defanged: string; value: string; locale: Locale }) {
  const en = locale === "en";
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
      <code className="break-all font-mono text-[12.5px] text-ink">{defanged}</code>
      <button
        onClick={copy}
        aria-label={en ? "Copy" : "Kopyala"}
        // Visible on hover, keyboard focus, AND on touch (no hover) — otherwise the
        // copy control is unreachable for keyboard/phone users during an incident.
        className="label shrink-0 text-ink-3 opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
      >
        {copied ? "✓" : en ? "copy" : "kopyala"}
      </button>
    </div>
  );
}

function CopyAll({ values, locale }: { values: string[]; locale: Locale }) {
  const en = locale === "en";
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
    <button onClick={copy} className="label ulink text-ink-3 hover:text-ink">
      {copied ? (en ? "✓ copied" : "✓ kopyalandı") : en ? "copy all" : "hamısını kopyala"}
    </button>
  );
}
