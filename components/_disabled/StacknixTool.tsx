"use client";

import { useEffect, useState } from "react";

// ---- shapes mirror lib/stacknix.ts GatedReport (kept loose on the client) ----
type Finding = {
  cve: string; verdict: string; tier: number; kev: boolean; kevDateAdded: string | null;
  ransomware: boolean; epss: number | null; epssPercentile: number | null; cvss: number | null;
  severity: string | null; cvssVector: string | null; matchedBound: string | null;
  matchedCpe: string | null; fixedVersion: string | null; caveats: string[]; summary: string;
  refs: string[]; published: string | null;
};
type Item = {
  input: string; product: string; version: string | null;
  resolved: { vendor: string; product: string; title: string } | null;
  resolutionConfidence: string; candidates: { vendor: string; product: string; title: string }[];
  findings: Finding[];
  counts: { vulnerable: number; kev: number; unconfirmed: number; notAffected: number; total: number };
  truncated: boolean; note: string | null;
};
type Report = {
  items: Item[];
  summary: { stackSize: number; resolved: number; vulnerable: number; kev: number; unconfirmed: number; worst: Finding | null; worstProduct: string | null };
  coverage: { kevCatalogDate: string | null; epssModelDate: string; nvdRetrievedAt: string };
  gated: boolean; worstFinding: Finding | null;
};

const SAMPLE = "apache http_server 2.4.49\nopenssh 8.2p1\nfortinet fortios 7.0.5\nlog4j 2.14.1";

const VLABEL: Record<string, string> = {
  vulnerable: "IN RANGE", "not-affected": "NOT IN RANGE", unconfirmed: "CAN'T CONFIRM", "version-unknown": "VERSION UNKNOWN",
};
const CAVEAT_TEXT: Record<string, string> = {
  "possible-backport": "Distro may have backported the fix at this version string — confirm via your distro's security tracker.",
  "name-collision": "Low-confidence product match — verify the CPE above is the product you run.",
  "no-version-data": "No version supplied — showing all CVEs for this product.",
};

function fmtEpss(e: number | null) { return e == null ? "—" : e.toFixed(2); }
function sevWord(s: string | null, c: number | null) { return (s || (c != null ? (c >= 9 ? "critical" : c >= 7 ? "high" : c >= 4 ? "medium" : "low") : "")).toUpperCase(); }

export function StacknixTool({ en }: { en: boolean }) {
  const [text, setText] = useState(SAMPLE);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<{ code: string; message: string } | null>(null);
  const [openCve, setOpenCve] = useState<string | null>(null);
  const [showClean, setShowClean] = useState(false);

  useEffect(() => {
    // Restore a saved key on mount. Deferred (not a direct setState-in-effect)
    // and client-only, matching the codebase's localStorage-restore pattern.
    let k = ""; try { k = localStorage.getItem("skopnix_key") || ""; } catch {}
    if (k) { const t = setTimeout(() => setKey(k), 0); return () => clearTimeout(t); }
  }, []);

  async function run(withKey = key) {
    setLoading(true); setErr(null); setReport(null);
    try {
      const r = await fetch("/api/stacknix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stack: text, key: withKey || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setErr({ code: data.error || "error", message: data.message || "Scan failed." }); return; }
      setReport(data as Report);
    } catch {
      setErr({ code: "network", message: en ? "Network error — try again." : "Şəbəkə xətası — yenidən cəhd et." });
    } finally { setLoading(false); }
  }

  function saveKey(k: string) {
    setKey(k);
    try { if (k) localStorage.setItem("skopnix_key", k); else localStorage.removeItem("skopnix_key"); } catch {}
  }

  const lineCount = text.split(/[\n;]+/).filter((l) => l.trim()).length;

  return (
    <div className="mx-auto w-full max-w-[64rem] px-[var(--sp-gutter)]">
      {/* ---- input ---- */}
      <div className="pt-[clamp(24px,4vw,40px)]">
        <p className="font-display text-[1.1rem] font-semibold text-[#F2F4FA]">{en ? "Paste what's running. We'll check it." : "İşləyəni yapışdır. Biz yoxlayacağıq."}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={Math.min(10, Math.max(4, lineCount + 1))}
          className="mt-3 block w-full resize-y border-y border-white/[0.08] bg-transparent py-3 font-mono text-[14px] leading-[22px] text-[#EDF1F6] outline-none placeholder:text-[#4b5563] focus:border-[var(--brand)]/40"
          placeholder={"apache http_server 2.4.49\nopenssh 8.2p1\nfortinet fortios 7.0.5\nlog4j 2.14.1"}
          aria-label={en ? "your tech stack" : "texnologiya stekin"}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => run()}
            disabled={loading || !text.trim()}
            className="inline-flex items-center gap-2 rounded-[3px] bg-[var(--brand)] px-5 py-2.5 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? (en ? "Checking…" : "Yoxlanılır…") : en ? "Check exposure" : "Məruzqalmanı yoxla"} {!loading && "→"}
          </button>
          <button onClick={() => { setText(SAMPLE); setReport(null); }} className="font-mono text-[length:var(--t-micro)] text-[#79838F] hover:text-[#EDF1F6]">
            {en ? "load sample" : "nümunə yüklə"}
          </button>
          <span className="ml-auto font-mono text-[length:var(--t-micro)] text-[#79838F]">{lineCount} {en ? "components" : "komponent"} · {key ? "builder" : "free · 5 max"}</span>
        </div>
        {!report && !loading && (
          <p className="mt-3 font-mono text-[length:var(--t-micro)] text-[#79838F]">{en ? "First-time product lookups take ~10s each — NVD keyless rate limit. Repeat products are instant." : "İlk axtarışlar hər biri ~10s çəkir — NVD limiti. Təkrarlar dərhal."}</p>
        )}
      </div>

      {loading && <Loading en={en} lines={text.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean).slice(0, key ? 15 : 5)} />}

      {err && (
        <div className="mt-8 border-y border-white/[0.08] py-5">
          <p className="font-mono text-[13px] text-[#FF5A4D]">{err.code === "rate_limited" ? (en ? "3 free scans used today." : "Bu gün 3 pulsuz yoxlama istifadə olundu.") : err.message}</p>
          {err.code === "rate_limited" && <UnlockCta en={en} onKey={(k) => { saveKey(k); run(k); }} />}
        </div>
      )}

      {report && <ReportView report={report} en={en} openCve={openCve} setOpenCve={setOpenCve} showClean={showClean} setShowClean={setShowClean} onKey={(k) => { saveKey(k); run(k); }} />}
    </div>
  );
}

function Loading({ en, lines }: { en: boolean; lines: string[] }) {
  return (
    <div className="mt-8 border-t border-white/[0.08]">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between border-b border-white/[0.06] py-3 font-mono text-[12px]">
          <span className="truncate text-[#9AA6B4]">{l}</span>
          <span className="text-brand">{i === 0 ? "cpe ✓ · nvd pull…" : en ? "queued · nvd rate window" : "növbədə"}</span>
        </div>
      ))}
    </div>
  );
}

function ReportView({ report, en, openCve, setOpenCve, showClean, setShowClean, onKey }: {
  report: Report; en: boolean; openCve: string | null; setOpenCve: (v: string | null) => void;
  showClean: boolean; setShowClean: (v: boolean) => void; onKey: (k: string) => void;
}) {
  const s = report.summary;
  const scanned = new Date(report.coverage.nvdRetrievedAt).toISOString().slice(0, 16).replace("T", " ");
  // severity distribution across affected findings we can see
  const affected = report.items.flatMap((i) => i.findings).filter((f) => f.verdict !== "not-affected");
  const totalAffected = report.items.reduce((n, i) => n + i.counts.vulnerable + i.counts.unconfirmed, 0);

  return (
    <div className="mt-10">
      {/* subject line */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em] text-[#EDF1F6]">{en ? "Exposure report" : "Məruzqalma hesabatı"}</h2>
        <span className="font-mono text-[13px] text-[#8B93A7]">{s.resolved}/{s.stackSize} {en ? "resolved" : "tanındı"} · {scanned} UTC · NVD/KEV/EPSS</span>
      </div>

      {/* summary band = the spine */}
      <div className="mt-5">
        <SeverityBar report={report} totalAffected={totalAffected} />
        <p className="mt-4 max-w-[62ch] font-display text-[1.06rem] leading-[1.5] text-[#EDF1F6]">
          {s.worst ? (
            <>
              <b className="font-semibold text-[#FF5A1F]">{s.kev}</b> {en ? "of" : "/"} <b className="font-semibold">{totalAffected}</b> {en ? "findings are exploited in the wild." : "təhlükə vəhşi təbiətdə istismar olunur."}{" "}
              {en ? "Worst" : "Ən pis"}: <span className="font-mono text-[0.95em]">{s.worst.cve}</span> — {s.worstProduct}
              {s.worst.kevDateAdded ? `, KEV ${en ? "since" : "—"} ${s.worst.kevDateAdded}` : ""}
              {s.worst.epss != null ? `, EPSS ${fmtEpss(s.worst.epss)}` : ""}.
            </>
          ) : (
            <>{en ? `0 CVEs in range — ${report.items.reduce((n, i) => n + i.counts.total, 0)} evaluated against ${s.resolved} products · KEV cross-checked · ${report.coverage.epssModelDate}. No match ≠ proof of safety.` : `0 CVE diapazonda — ${s.resolved} məhsul yoxlanıldı. Uyğunluq yoxdur ≠ təhlükəsizlik zəmanəti.`}</>
          )}
        </p>
      </div>

      {/* tier-1: KEV & in range — the act-now list */}
      {(() => {
        const t1 = affected.filter((f) => f.tier === 1);
        if (!t1.length) return null;
        return (
          <div className="mt-8 border border-[rgba(255,90,31,0.28)] bg-[rgba(255,90,31,0.05)] rounded-md overflow-hidden">
            <div className="border-b border-[rgba(255,90,31,0.2)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#FF5A1F]">{en ? "Act now — exploited in the wild, your version" : "İndi hərəkət et — vəhşidə istismar, sənin versiyan"}</div>
            {t1.map((f) => <CveRow key={"t1" + f.cve} f={f} en={en} open={openCve === f.cve} onToggle={() => setOpenCve(openCve === f.cve ? null : f.cve)} accent />)}
          </div>
        );
      })()}

      {/* per-product ledgers */}
      <div className="mt-8">
        {report.items.map((it, idx) => (
          <ItemBlock key={idx} it={it} en={en} gated={report.gated} openCve={openCve} setOpenCve={setOpenCve} showClean={showClean} setShowClean={setShowClean} onKey={onKey} />
        ))}
      </div>

      {/* free-tier paywall */}
      {report.gated && <Paywall report={report} en={en} onKey={onKey} />}

      {/* coverage ledger */}
      <p className="mt-12 border-t border-white/[0.08] pt-6 font-mono text-[11px] leading-relaxed text-[#79838F]">
        KEV {en ? "catalog" : "kataloq"} {report.coverage.kevCatalogDate || "—"} · EPSS {report.coverage.epssModelDate} · NVD {en ? "retrieved" : "alındı"} {scanned}Z.
        <br />{en ? "This is exposure by version claim — no authentication, no config check, no reachability check." : "Bu, versiya iddiasına görə məruzqalmadır — autentifikasiya, konfiqurasiya və çatımlılıq yoxlaması yoxdur."}
      </p>
    </div>
  );
}

function SeverityBar({ report, totalAffected }: { report: Report; totalAffected: number }) {
  // count by severity across affected findings the client can see; when gated we
  // only have the worst finding, so fall back to KEV/total proportions.
  const affected = report.items.flatMap((i) => i.findings).filter((f) => f.verdict !== "not-affected");
  const buckets = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of affected) {
    const w = sevWord(f.severity, f.cvss).toLowerCase();
    if (w in buckets) (buckets as Record<string, number>)[w]++;
  }
  const seen = affected.length || 1;
  const kevFrac = report.summary.kev / (totalAffected || 1);
  const seg = (c: string, frac: number) => (frac > 0 ? <span key={c} style={{ width: `${Math.max(2, frac * 100)}%`, background: c }} className="block h-full" /> : null);
  return (
    <div className="flex h-[6px] w-full overflow-hidden rounded-full bg-white/[0.05]">
      {report.gated
        ? <>{seg("#FF5A1F", kevFrac)}{seg("#A9AFC3", 1 - kevFrac)}</>
        : <>
            {seg("#FF5A1F", report.summary.kev / seen)}
            {seg("#E8EAF2", buckets.critical / seen)}
            {seg("#A9AFC3", buckets.high / seen)}
            {seg("#565D72", buckets.medium / seen)}
            {seg("#2A3040", buckets.low / seen)}
          </>}
    </div>
  );
}

function ItemBlock({ it, en, gated, openCve, setOpenCve, showClean, setShowClean, onKey }: {
  it: Item; en: boolean; gated: boolean; openCve: string | null; setOpenCve: (v: string | null) => void;
  showClean: boolean; setShowClean: (v: boolean) => void; onKey: (k: string) => void;
}) {
  const shown = it.findings.filter((f) => f.verdict !== "not-affected");
  const clean = it.findings.filter((f) => f.verdict === "not-affected");
  const withheld = gated ? Math.max(0, it.counts.vulnerable + it.counts.unconfirmed - shown.length) : 0;
  void onKey;
  return (
    <div className="border-t border-[rgba(111,211,230,0.18)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4">
        <div className="min-w-0">
          <span className="font-display text-[1.12rem] font-semibold text-[#F2F4FA]">{it.resolved?.title || it.product}</span>
          {it.version && <span className="ml-2 font-mono text-[13px] text-[#9AA6B4]">{it.version}</span>}
          <div className="mt-0.5 font-mono text-[11px] text-ink-muted">
            {it.resolved ? `matched cpe:2.3:${it.resolved.vendor === "microsoft" ? "a" : "a"}:${it.resolved.vendor}:${it.resolved.product}` : (en ? "no CPE match — check the product name" : "CPE tapılmadı — məhsul adını yoxla")}
            {it.resolutionConfidence === "low" && <span className="text-[#F6B44A]"> · {en ? "low confidence" : "aşağı əminlik"}</span>}
          </div>
        </div>
        <span className="font-mono text-[12px] text-[#79838F]">
          {it.counts.vulnerable > 0 && <span className="text-[#EDF1F6]">{it.counts.vulnerable} {en ? "in range" : "diapazonda"}</span>}
          {it.counts.kev > 0 && <span className="text-[#FF5A1F]"> · {it.counts.kev} KEV</span>}
          {it.counts.unconfirmed > 0 && <span> · {it.counts.unconfirmed} {en ? "unconfirmed" : "təsdiqsiz"}</span>}
          {it.counts.notAffected > 0 && <span> · {it.counts.notAffected} {en ? "clear" : "təmiz"}</span>}
        </span>
      </div>
      {shown.map((f) => <CveRow key={f.cve} f={f} en={en} open={openCve === f.cve} onToggle={() => setOpenCve(openCve === f.cve ? null : f.cve)} />)}
      {withheld > 0 && (
        <div className="flex items-center gap-3 py-3 font-mono text-[12px] text-[#79838F]">
          <span className="text-ink-muted">••• {withheld} {en ? "findings withheld on Free" : "nəticə Free-də gizlədilib"}</span>
        </div>
      )}
      {!gated && clean.length > 0 && (
        <button onClick={() => setShowClean(!showClean)} className="py-2 font-mono text-[11px] text-ink-muted hover:text-[#9AA6B4]">
          {showClean ? "▾" : "▸"} {clean.length} {en ? "not in range (hidden)" : "diapazonda deyil"}
        </button>
      )}
      {!gated && showClean && clean.map((f) => <CveRow key={f.cve} f={f} en={en} open={openCve === f.cve} onToggle={() => setOpenCve(openCve === f.cve ? null : f.cve)} muted />)}
    </div>
  );
}

function CveRow({ f, en, open, onToggle, accent, muted }: { f: Finding; en: boolean; open: boolean; onToggle: () => void; accent?: boolean; muted?: boolean }) {
  const label = VLABEL[f.verdict] || f.verdict;
  return (
    <div className={`border-b border-white/[0.06] ${muted ? "opacity-40" : ""}`} style={f.kev ? { boxShadow: "inset 2px 0 0 #FF5A1F" } : undefined}>
      <button onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[1fr_auto] items-start gap-3 py-3 pl-3 pr-1 text-left hover:bg-[rgba(111,211,230,0.04)]">
        <span className="min-w-0">
          <span className="font-mono text-[13px] text-[#E8EAF2]">{f.cve}</span>
          {f.summary && <span className="mt-0.5 block truncate text-[13px] text-[#9AA3B2]">{f.summary}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-3 font-mono text-[11px] tabular-nums">
          <span className={f.verdict === "vulnerable" ? "text-[#E8EAF2]" : f.verdict === "not-affected" ? "text-ink-muted" : "text-[#9AA3B2] underline decoration-dashed underline-offset-2"}>{label}</span>
          {f.kev && <span className="flex items-center gap-1 text-[#FF5A1F]"><span className="size-1.5 rounded-full bg-[#FF5A1F]" />KEV</span>}
          <span className="flex items-center gap-1.5 text-[#9AA6B4]">
            <span className="h-[4px] w-[36px] overflow-hidden rounded-full bg-white/[0.08]"><span className="block h-full bg-[#A9AFC3]" style={{ width: `${Math.round((f.epss ?? 0) * 100)}%` }} /></span>
            {fmtEpss(f.epss)}
          </span>
          <span className="text-[#9AA6B4]">{f.cvss != null ? `${f.cvss} ${sevWord(f.severity, f.cvss).slice(0, 4)}` : "—"}</span>
        </span>
      </button>
      {open && (
        <div className="grid gap-2 px-3 pb-4 font-mono text-[12px] text-[#9AA6B4]">
          {f.matchedBound && <div><span className="text-ink-muted">{en ? "evidence" : "sübut"} </span><span className="text-brand">{f.matchedBound}</span></div>}
          {f.matchedCpe && <div className="truncate text-ink-muted">{f.matchedCpe}</div>}
          {f.kev && <div className="text-[#FF5A1F]">{en ? "exploited in the wild" : "vəhşidə istismar"}{f.kevDateAdded ? ` · KEV ${f.kevDateAdded}` : ""}{f.ransomware ? ` · ${en ? "ransomware" : "ransomware"}` : ""}</div>}
          {f.fixedVersion && f.verdict === "vulnerable" && <div className="text-[#5FE0A8]">{en ? "fix: upgrade to" : "düzəliş: yenilə"} {f.fixedVersion}{f.refs[0] ? " · " : ""}{f.refs[0] && <a href={f.refs[0]} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{en ? "advisory ↗" : "bildiriş ↗"}</a>}</div>}
          {f.caveats.map((c) => <div key={c} className="text-[#F6B44A]">⚠ {CAVEAT_TEXT[c]}</div>)}
        </div>
      )}
      {accent && null}
    </div>
  );
}

function Paywall({ report, en, onKey }: { report: Report; en: boolean; onKey: (k: string) => void }) {
  const withheld = report.items.reduce((n, i) => n + i.counts.vulnerable + i.counts.unconfirmed, 0) - (report.worstFinding ? 1 : 0);
  return (
    <div className="mt-8 border-y border-white/[0.1] py-7">
      <p className="font-mono text-[13px] text-[#9AA6B4]">{withheld} {en ? "findings withheld on Free — including" : "nəticə Free-də gizlədilib —"} <b className="text-[#EDF1F6]">{report.summary.kev} KEV</b> {en ? "and every remediation." : "və hər düzəliş."}</p>
      <UnlockCta en={en} onKey={onKey} />
    </div>
  );
}

function UnlockCta({ en, onKey }: { en: boolean; onKey: (k: string) => void }) {
  const [k, setK] = useState("");
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <a href="/pricing" className="inline-flex items-center gap-2 rounded-[3px] bg-[var(--brand)] px-5 py-2.5 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform hover:-translate-y-0.5">
        {en ? "Unlock full report — Builder $49/mo" : "Tam hesabatı aç — Builder $49/ay"} →
      </a>
      <span className="flex items-center gap-2 font-mono text-[12px] text-[#79838F]">
        {en ? "have a key?" : "açarın var?"}
        <input value={k} onChange={(e) => setK(e.target.value)} placeholder="sk_…" className="w-40 border-b border-white/[0.15] bg-transparent py-1 text-[#EDF1F6] outline-none focus:border-[var(--brand)]/50" />
        <button onClick={() => k.trim() && onKey(k.trim())} className="text-brand hover:underline">{en ? "apply" : "tətbiq"}</button>
      </span>
    </div>
  );
}
