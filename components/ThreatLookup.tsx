"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./locale";

type TfHit = {
  ioc: string;
  kind: "ip" | "domain" | "url" | "hash";
  malware: string;
  malwareAlias?: string;
  threatType: string;
  confidence: number;
  firstSeen?: string;
  lastSeen?: string;
  reference?: string;
  tags: string[];
  port?: number;
};
type Identity = { country?: string; countryCode?: string; city?: string; asn?: string; org?: string };
type Cve = {
  id: string; kev: boolean; epss: number | null; cvss: number | null;
  severity: string | null; vector: string | null; description: string | null;
  published: string | null; refs: string[];
};
type Result = {
  input: string;
  kind: "cve" | "ip" | "domain" | "url" | "hash";
  verdict: "malicious" | "unknown" | "exploited" | "elevated" | "known";
  cve?: Cve;
  hits?: TfHit[];
  hitCount?: number;
  identity?: Identity;
  resolvedFrom?: string;
  resolvedIp?: string | null;
};

const KIND_LABEL: Record<Result["kind"], string> = {
  cve: "CVE", ip: "IP", domain: "Domen", url: "URL", hash: "Hash",
};
const KIND_LABEL_EN: Record<Result["kind"], string> = {
  cve: "CVE", ip: "IP", domain: "Domain", url: "URL", hash: "Hash",
};
const THREAT_LABEL: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Zərərli yük çatdırılması",
  payload: "Zərərli yük", malware_download: "Malware endirmə",
};
const THREAT_LABEL_EN: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Payload delivery",
  payload: "Payload", malware_download: "Malware download",
};

function defang(kind: string, v: string): string {
  if (kind === "hash") return v;
  const d = v.replace(/\./g, "[.]");
  return kind === "url" ? d.replace(/^http/i, "hxxp") : d;
}

const RING: Record<string, string> = {
  malicious: "border-accent-critical/50 bg-accent-critical/5",
  exploited: "border-accent-critical/50 bg-accent-critical/5",
  elevated: "border-accent-serious/50 bg-accent-serious/5",
  known: "border-accent-warning/40 bg-accent-warning/5",
  unknown: "border-hairline bg-surface",
};
const DOT: Record<string, string> = {
  malicious: "text-accent-critical", exploited: "text-accent-critical",
  elevated: "text-accent-serious", known: "text-accent-warning", unknown: "text-ink-muted",
};
const VERDICT_AZ: Record<string, { title: string; sub: string }> = {
  malicious: { title: "Zərərli — abuse.ch-də qeydə alınıb", sub: "Bu indikator hazırda aktiv təhdid infrastrukturuna aiddir. Aşağıda arxasındakı zərərli proqram ailəsi." },
  exploited: { title: "Aktiv istismar olunur — CISA KEV", sub: "Bu CVE vəhşi təbiətdə aktiv istismar olunur. Təcili yamaqlama prioritetidir." },
  elevated: { title: "Yüksək risk", sub: "Yüksək CVSS və ya istismar ehtimalı. Qısa müddətdə yamaqlanmalıdır." },
  known: { title: "Məlum zəiflik", sub: "NVD-də qeydə alınıb. Aktiv istismar əlaməti yoxdur, amma izlənilməlidir." },
  unknown: { title: "abuse.ch-nin aktiv siyahısında deyil", sub: "Son günlərin aktiv təhdid siyahısında tapılmadı. Diqqət: bu «təhlükəsiz» demək deyil — yalnız hazırda məlum zərərli kimi işarələnməyib." },
};
const VERDICT_EN: Record<string, { title: string; sub: string }> = {
  malicious: { title: "Malicious — logged by abuse.ch", sub: "This indicator currently belongs to active threat infrastructure. The malware family behind it is below." },
  exploited: { title: "Actively exploited — CISA KEV", sub: "This CVE is being actively exploited in the wild. It's an urgent patch priority." },
  elevated: { title: "Elevated risk", sub: "High CVSS or exploit probability. Should be patched soon." },
  known: { title: "Known vulnerability", sub: "Logged in NVD. No sign of active exploitation, but worth tracking." },
  unknown: { title: "Not on abuse.ch's active list", sub: "Not found in the recent active-threat list. Note: this does not mean «safe» — only that it isn't currently flagged as known-malicious." },
};

export function ThreatLookup({ exampleIndicator }: { exampleIndicator?: string }) {
  const en = useLocale() === "en";
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function run(term: string) {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/threat?q=${encodeURIComponent(term)}`);
      const data = await r.json();
      if (!r.ok) setError(data.error || (en ? "Something went wrong" : "Xəta baş verdi"));
      else setResult(data as Result);
    } catch {
      setError(en ? "Network error — try again" : "Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setLoading(false);
    }
  }

  // Prefill + auto-run from ?q= (the "yoxla →" links on the aggregation feed).
  // Read on mount from the URL so the page itself stays statically rendered.
  useEffect(() => {
    const q0 = new URLSearchParams(window.location.search).get("q");
    if (q0 && q0.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time ?q= prefill + auto-run on mount; keeps the page statically rendered
      setQ(q0.trim());
      run(q0.trim());
    }
  }, []);

  const examples = [
    ["CVE-2021-44228", "CVE nümunə"],
    exampleIndicator ? [exampleIndicator, "canlı C2 nümunə"] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <div className="rounded-md border border-hairline bg-surface-raised/40 p-5 sm:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) run(q.trim());
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={en ? "IP · domain · URL · hash · CVE — paste here" : "IP · domen · URL · hash · CVE — yapışdırın"}
          aria-label={en ? "Indicator: IP, domain, URL, hash or CVE" : "İndikator: IP, domen, URL, hash və ya CVE"}
          className="flex-1 rounded-sm border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-sm bg-brand px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {en ? "Check" : "Yoxla"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-muted">
        <span>{en ? "examples:" : "nümunə:"}</span>
        {examples.map(([ex, label]) => (
          <button
            key={ex}
            type="button"
            onClick={() => { setQ(ex); run(ex); }}
            className="text-brand hover:underline"
            title={label}
          >
            {ex}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-muted">
        {en ? "Indicator reputation (abuse.ch ThreatFox) or CVE triage (CISA KEV · FIRST EPSS · NVD). No key required." : "İndikatorun reputasiyası (abuse.ch ThreatFox) və ya CVE triage-i (CISA KEV · FIRST EPSS · NVD). Açar tələb olunmur."}
      </p>

      {loading && (
        <p className="mt-5 font-mono text-xs text-ink-secondary">
          <span className="text-accent-good">●</span> {en ? "checking…" : "yoxlanılır…"}
        </p>
      )}
      {error && <p className="mt-5 font-mono text-xs text-accent-critical">{error}</p>}
      {result && !loading && <ResultView r={result} />}
    </div>
  );
}

function pct(n: number | null): string {
  return n == null ? "—" : `${(n * 100).toFixed(n * 100 < 1 ? 2 : 1)}%`;
}
function dateOnly(s?: string | null): string {
  return s ? s.slice(0, 10) : "—";
}

function ResultView({ r }: { r: Result }) {
  const en = useLocale() === "en";
  const v = { ...(en ? VERDICT_EN : VERDICT_AZ)[r.verdict], ring: RING[r.verdict], dot: DOT[r.verdict] };
  const kindLabel = en ? KIND_LABEL_EN : KIND_LABEL;
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-ink-primary break-all">
          {r.kind === "cve" ? r.input : defang(r.kind, r.input)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-secondary">
          {kindLabel[r.kind]}
        </span>
        {r.resolvedFrom && <span className="font-mono text-[11px] text-ink-muted">host → {r.resolvedFrom}</span>}
      </div>

      <div className={`mt-4 rounded-md border ${v.ring} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <span className={v.dot}>●</span>
          <span className="font-semibold text-ink-primary">{v.title}</span>
        </div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-secondary">{v.sub}</p>
      </div>

      {r.kind === "cve" && r.cve && <CveView c={r.cve} />}
      {r.kind !== "cve" && <IndicatorView r={r} />}
    </div>
  );
}

function CveView({ c }: { c: Cve }) {
  const en = useLocale() === "en";
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-hairline bg-surface px-4 py-3 sm:grid-cols-4">
        <Field k={en ? "Actively exploited" : "Aktiv istismar"} v={c.kev ? (en ? "Yes · CISA KEV" : "Bəli · CISA KEV") : (en ? "No sign" : "Əlamət yox")} accent={c.kev ? "critical" : undefined} />
        <Field k={en ? "EPSS (exploit prob.)" : "EPSS (istismar eht.)"} v={pct(c.epss)} mono />
        <Field
          k="CVSS"
          v={c.cvss != null ? `${c.cvss}${c.severity ? ` · ${c.severity}` : ""}` : "—"}
          mono
          accent={c.cvss != null && c.cvss >= 9 ? "critical" : c.cvss != null && c.cvss >= 7 ? "serious" : undefined}
        />
        <Field k={en ? "Published" : "Dərc olundu"} v={dateOnly(c.published)} mono />
      </div>
      {c.description && (
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-secondary">{c.description}</p>
      )}
      {c.vector && (
        <p className="mt-2 font-mono text-[11px] text-ink-muted break-all">{c.vector}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={`https://nvd.nist.gov/vuln/detail/${c.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] uppercase tracking-widest text-accent-critical hover:underline"
        >
          {en ? "View on NVD" : "NVD-də bax"} ↗
        </a>
        {c.refs.slice(0, 3).map((u, i) => (
          <a
            key={u}
            href={u}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-ink-muted hover:text-ink-secondary hover:underline"
          >
            {en ? "ref" : "istinad"} {i + 1} ↗
          </a>
        ))}
      </div>
    </>
  );
}

function IndicatorView({ r }: { r: Result }) {
  const en = useLocale() === "en";
  const id = r.identity;
  const hasId = id && (id.country || id.asn || id.org);
  return (
    <>
      {hasId && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-hairline bg-surface px-4 py-3 sm:grid-cols-3">
          <Field k={en ? "Country" : "Ölkə"} v={[id!.city, id!.country].filter(Boolean).join(", ") || id!.countryCode} />
          <Field k="ASN" v={id!.asn} mono />
          <Field k={en ? "Operator" : "Operator"} v={id!.org} />
        </div>
      )}

      {r.hits && r.hits.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {en ? "Threat records" : "Təhdid qeydləri"} · <span className="text-accent-critical">{r.hitCount}</span>
          </div>
          {r.hits.map((h, i) => (
            <div key={i} className="rounded-md border border-accent-critical/25 bg-accent-critical/[0.03] px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-ink-primary">{h.malware}</span>
                {h.malwareAlias && <span className="font-mono text-[11px] text-ink-muted">{h.malwareAlias}</span>}
                {h.threatType && (
                  <span className="rounded-sm border border-hairline px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent-serious">
                    {(en ? THREAT_LABEL_EN : THREAT_LABEL)[h.threatType] || h.threatType}
                  </span>
                )}
                <span className="ml-auto font-mono text-[11px] text-ink-muted tabular-nums">
                  {h.confidence}% {en ? "confidence" : "əminlik"}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-muted">
                {h.port != null && <span>port :{h.port}</span>}
                <span>{en ? "first seen" : "ilk görünüş"} {dateOnly(h.firstSeen)}</span>
                {h.tags.length > 0 && <span className="text-ink-secondary">{h.tags.slice(0, 5).join(" · ")}</span>}
                {h.reference && (
                  <a href={h.reference} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {en ? "source" : "mənbə"} ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 font-mono text-[11px] text-ink-muted">
          {en ? "Source: abuse.ch ThreatFox — the recent active-indicator list." : "Mənbə: abuse.ch ThreatFox — son günlərin aktiv indikator siyahısı."}
        </p>
      )}
    </>
  );
}

function Field({ k, v, mono, accent }: { k: string; v?: string; mono?: boolean; accent?: "critical" | "serious" }) {
  const color = accent === "critical" ? "text-accent-critical" : accent === "serious" ? "text-accent-serious" : "text-ink-primary";
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{k}</div>
      <div className={`mt-0.5 text-[13px] break-words ${color} ${mono ? "font-mono text-[12px]" : ""}`}>{v || "—"}</div>
    </div>
  );
}
