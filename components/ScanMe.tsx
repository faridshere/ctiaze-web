"use client";

import { useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";
import { breachActions, riskLabel, type Risk } from "@/lib/breachactions";

const RISK_CHIP: Record<Risk, string> = {
  critical: "border-accent-critical/40 bg-accent-critical/10 text-accent-critical",
  high: "border-accent-warning/50 bg-accent-warning/10 text-accent-warning",
  medium: "border-accent-warning/30 bg-surface text-accent-warning",
  low: "border-hairline bg-surface text-ink-muted",
};

type Breach = {
  name: string; domain?: string; industry?: string; year?: string;
  verified: boolean; passwordRisk?: string; exposed: string[]; hasPassword: boolean;
};
type Infostealer = {
  status: "ok" | "unavailable"; infected: boolean; count: number;
  lastCompromised: string | null; corporateServices: number; userServices: number; source: string;
} | null;
type EmailResult = {
  kind: "email"; status: "ok" | "unavailable" | "invalid"; count: number;
  riskLabel: string | null; riskScore: number | null; passwordsExposed: boolean;
  breaches: Breach[]; exposedData: string[]; pastesCount: number; hibp: boolean;
  infostealer: Infostealer; source: string; fetched_at: string | null;
};
type EmailSecurity = {
  status: "ok" | "unavailable"; mx: boolean;
  spf: { present: boolean; policy: string | null }; dmarc: { present: boolean; policy: string | null };
  source: string; fetched_at: string;
} | null;
type DomainInfostealer = {
  status: "ok" | "unavailable"; found: boolean; employees: number; users: number; thirdParties: number;
  total: number; lastEmployee: string | null; lastUser: string | null; families: string[]; source: string;
} | null;
type SubBlock = { status: "ok" | "unavailable"; count: number; sample: string[]; source: string; fetched_at: string };
type ExposureBlock = {
  status: "ok" | "unavailable"; ip: string | null; found: boolean;
  ports: number[]; vulns: string[]; tags: string[]; source: string; fetched_at: string;
};
type MentionStory = { title: string; url: string; source: string; published: string | null };
type MentionBlock = { status: "ok" | "unavailable"; count: number; stories: MentionStory[]; source: string; fetched_at: string };
type WatchBlock = { product: string; az_exposed: number; as_of: string; source: string; fetched_at: string } | null;
type DomainResult = {
  kind: "domain"; domain: string | null; status: "ok" | "invalid";
  subdomains: SubBlock | null; exposure: ExposureBlock | null; mentions: MentionBlock | null; watchlist: WatchBlock;
  emailSecurity: EmailSecurity; infostealer: DomainInfostealer;
};
type ScanResult = EmailResult | DomainResult;
type PwState = { state: "pwned" | "clean" | "unavailable"; count?: number } | null;

const EXAMPLES = ["namiq@example.az", "example.az"];

const DATA_LABEL_AZ: Record<string, string> = {
  passwords: "Parollar", "email addresses": "E-poçt", names: "Adlar", usernames: "İstifadəçi adları",
  "phone numbers": "Telefon", "physical addresses": "Ünvanlar", "dates of birth": "Doğum tarixi",
  "ip addresses": "IP ünvanlar", genders: "Cins", "geographic locations": "Məkan",
  "device information": "Cihaz məlumatı", "auth tokens": "Auth token", "auth token": "Auth token",
  "credit cards": "Kart məlumatı", "credit card details": "Kart məlumatı",
  "social media profiles": "Sosial media", "security questions and answers": "Təhlükəsizlik sualları",
  "account balances": "Hesab balansı", "financial transactions": "Maliyyə əməliyyatları",
  "government ids": "Dövlət ID", "government issued ids": "Dövlət ID",
};
function dataLabel(s: string, locale: Locale): string {
  return locale === "az" ? DATA_LABEL_AZ[s.trim().toLowerCase()] ?? s : s;
}

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function ScanMe({ locale }: { locale: Locale }) {
  const t = getDict(locale).scan;
  const c = getDict(locale).common;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const [pw, setPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwResult, setPwResult] = useState<PwState>(null);

  async function run(term: string) {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/scan?q=${encodeURIComponent(term)}`);
      const data = await r.json();
      if (!r.ok) setError(data.error || c.genericError);
      else setResult(data as ScanResult);
    } catch {
      setError(c.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function checkPassword(password: string) {
    setPwResult(null);
    setPwLoading(true);
    try {
      const hash = await sha1Hex(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const r = await fetch(`/api/pwned?prefix=${prefix}`);
      if (!r.ok) { setPwResult({ state: "unavailable" }); return; }
      const text = await r.text();
      let count = 0;
      for (const line of text.split("\n")) {
        const [suf, cnt] = line.trim().split(":");
        if (suf && suf.toUpperCase() === suffix) { count = parseInt(cnt, 10) || 0; break; }
      }
      setPwResult(count > 0 ? { state: "pwned", count } : { state: "clean" });
    } catch {
      setPwResult({ state: "unavailable" });
    } finally {
      setPwLoading(false);
    }
  }

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
            <span className="pointer-events-none absolute left-3.5 font-mono text-sm text-ink-muted">&gt;</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              placeholder={t.placeholder}
              aria-label={t.consoleLabel}
              className="w-full rounded-sm border border-hairline bg-surface py-2.5 pl-8 pr-3.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="rounded-sm bg-brand px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "…" : c.check}
          </button>
        </form>

        <p className="px-4 pb-4 font-mono text-[11px] text-ink-muted">
          <span className="text-ink-secondary">{t.hintPre}</span>{t.hintMid}
          {EXAMPLES.map((ex, i) => (
            <span key={ex}>
              {i > 0 && " · "}
              <button type="button" onClick={() => { setQ(ex); run(ex); }} className="text-brand hover:underline">
                {ex}
              </button>
            </span>
          ))}
        </p>
      </div>

      {loading && (
        <p role="status" className="mt-5 font-mono text-xs text-ink-secondary">
          <span className="text-accent-good">●</span> {c.loadingScan}
        </p>
      )}
      {error && <p role="alert" className="mt-5 font-mono text-xs text-accent-critical">{error}</p>}
      {result && !loading && (result.kind === "email" ? <EmailView r={result} t={t} locale={locale} /> : <DomainView r={result} t={t} />)}

      {/* password self-check (k-anonymity) */}
      <div className="mt-6 overflow-hidden rounded-md border border-hairline bg-surface-raised/40">
        <div className="flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-2.5">
          <span className="text-ink-muted">⚿</span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-secondary">{t.pwTitle}</span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-accent-good">{t.pwSubtitle}</span>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (pw) checkPassword(pw); }}
          className="flex flex-col gap-2 p-4 sm:flex-row"
        >
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={t.pwPlaceholder}
            aria-label={t.pwTitle}
            className="w-full flex-1 rounded-sm border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={pwLoading || !pw}
            className="rounded-sm bg-brand px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pwLoading ? "…" : c.check}
          </button>
        </form>
        <div className="px-4 pb-4">
          {pwLoading && <p className="font-mono text-[11px] text-ink-secondary"><span className="text-accent-good">●</span> {t.pwChecking}</p>}
          {!pwLoading && pwResult?.state === "pwned" && (
            <p className="rounded-sm border border-accent-critical/40 bg-accent-critical/10 px-3 py-2 text-[13px] leading-relaxed text-accent-critical">
              {t.pwPwned((pwResult.count ?? 0).toLocaleString("en-US"))}
            </p>
          )}
          {!pwLoading && pwResult?.state === "clean" && (
            <p className="rounded-sm border border-accent-good/40 bg-accent-good/[0.06] px-3 py-2 text-[13px] leading-relaxed text-accent-good">
              {t.pwClean}
            </p>
          )}
          {!pwLoading && pwResult?.state === "unavailable" && (
            <p className="font-mono text-[12px] text-ink-muted">{t.pwUnavailable}</p>
          )}
          {!pwResult && !pwLoading && <p className="font-mono text-[11px] leading-relaxed text-ink-muted">{t.pwNote}</p>}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-hairline bg-surface-raised/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">◑</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">{t.honestyLabel}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{t.honestyText}</p>
      </div>
    </div>
  );
}

type ScanDict = ReturnType<typeof getDict>["scan"];

function fmtDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}
function Source({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 border-t border-dashed border-hairline pt-3 font-mono text-[11px] text-ink-muted">
      <span aria-hidden="true">🛈</span>
      <span>{children}</span>
    </div>
  );
}

function InfostealerBanner({ steal, t }: { steal: NonNullable<Infostealer>; t: ScanDict }) {
  return (
    <article className="rounded-md border border-accent-critical/50 bg-accent-critical/10">
      <div className="flex items-center gap-3 border-b border-accent-critical/20 px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface text-accent-critical">☣</span>
        <h3 className="font-headline text-base text-accent-critical">{t.stealerTitle}</h3>
        <span className="ml-auto rounded-sm border border-accent-critical/40 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-widest text-accent-critical">{t.stealerBadge}</span>
      </div>
      <div className="px-4 py-4">
        <p className="text-[13.5px] leading-relaxed text-ink-secondary">{t.stealerDesc}</p>
        <div className="mt-2 font-mono text-[11px] text-ink-muted">
          {t.stealerMeta(steal.lastCompromised ? fmtDate(steal.lastCompromised) : "—", steal.corporateServices + steal.userServices)}
        </div>
        <Source>Hudson Rock Cavalier</Source>
      </div>
    </article>
  );
}

function ActionList({ actions, t, locale }: { actions: ReturnType<typeof breachActions>; t: ScanDict; locale: Locale }) {
  return (
    <div className="rounded-md border border-hairline bg-surface-raised/30 p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">{t.actionsTitle}</div>
      <p className="mt-1 text-[12px] text-ink-muted">{t.actionsNote}</p>
      <ol className="mt-3 space-y-2.5">
        {actions.map((a, i) => (
          <li key={i} className="flex gap-2.5">
            <span className={`mt-0.5 shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider ${RISK_CHIP[a.risk]}`}>
              {riskLabel(a.risk, locale)}
            </span>
            <span className="text-[13.5px] leading-relaxed text-ink-secondary">{locale === "en" ? a.en : a.az}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmailView({ r, t, locale }: { r: EmailResult; t: ScanDict; locale: Locale }) {
  if (r.status === "invalid") {
    return (
      <ResultCard label={t.emailResult}>
        <StateCard tone="warning" icon="?" title={t.invalidEmailTitle} badge="invalid">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">{t.invalidEmailText}</p>
        </StateCard>
      </ResultCard>
    );
  }
  const steal = r.infostealer;
  const infected = !!steal?.infected;
  const actions = breachActions(r.exposedData, { passwordsExposed: r.passwordsExposed, infostealer: infected }, locale);

  const verdict =
    r.status === "unavailable" ? (
      <StateCard tone="muted" icon="◑" title={t.unavailTitle} badge="unavailable">
        <p className="text-[13.5px] leading-relaxed text-ink-secondary">{t.unavailText}</p>
      </StateCard>
    ) : r.count === 0 ? (
      infected ? (
        <div className="rounded-md border border-hairline bg-surface-raised/30 px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">{t.stealerCleanNote}</div>
      ) : (
        <StateCard tone="good" icon="✓" title={t.cleanTitle} badge={t.cleanBadge}>
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">{t.cleanText}</p>
          <Source>XposedOrNot · {fmtDate(r.fetched_at)}</Source>
        </StateCard>
      )
    ) : (
      <StateCard tone="critical" icon="⚠" title={t.breachTitle} badge={t.foundBadge(r.count)}>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <div className="font-headline text-3xl text-accent-critical">{t.nBreach(r.count)}</div>
          {r.riskLabel && (
            <span className="pb-1 font-mono text-xs uppercase tracking-widest text-accent-critical">
              {t.riskWord}: {r.riskLabel}{r.riskScore != null ? ` · ${r.riskScore}/100` : ""}
            </span>
          )}
        </div>

        {r.passwordsExposed && (
          <p className="mt-3 rounded-sm border border-accent-critical/40 bg-accent-critical/10 px-3 py-2 text-[13px] leading-relaxed text-accent-critical">
            <b>{t.pwExposedBold}</b>{t.pwExposedRest}
          </p>
        )}

        {r.exposedData.length > 0 && (
          <div className="mt-3.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{t.exposedDataLabel}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {r.exposedData.slice(0, 12).map((d) => (
                <span key={d} className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] ${/password/i.test(d) ? "border-accent-critical/40 bg-accent-critical/10 text-accent-critical" : "border-hairline bg-surface text-ink-secondary"}`}>
                  {dataLabel(d, locale)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {r.breaches.map((b, i) => (
            <div key={`${b.name}-${i}`} className="border-t border-hairline pt-2.5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="text-[14px] font-semibold text-ink-primary">{b.name}</span>
                {b.year && <span className="font-mono text-[11px] text-ink-muted">{b.year}</span>}
                {b.hasPassword && (
                  <span className="rounded-sm border border-accent-critical/40 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent-critical">
                    {t.passwordTag}
                  </span>
                )}
                {b.verified && <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{t.verified}</span>}
              </div>
              {b.exposed.length > 0 && (
                <div className="mt-1 font-mono text-[11px] text-ink-muted">
                  {b.exposed.slice(0, 8).map((x) => dataLabel(x, locale)).join(" · ")}
                </div>
              )}
            </div>
          ))}
          {r.count > r.breaches.length && (
            <div className="border-t border-hairline pt-2.5 font-mono text-[12px] text-ink-muted">{t.moreBreaches(r.count - r.breaches.length)}</div>
          )}
        </div>

        {r.pastesCount > 0 && (
          <p className="mt-3 font-mono text-[12px] text-ink-secondary">{t.pastesLine(r.pastesCount)}</p>
        )}

        <Source>{r.hibp ? "HIBP + XposedOrNot + LeakCheck" : "XposedOrNot + LeakCheck"} · {fmtDate(r.fetched_at)}</Source>
      </StateCard>
    );

  return (
    <ResultCard label={t.emailResult}>
      <div className="space-y-4">
        {infected && steal && <InfostealerBanner steal={steal} t={t} />}
        {verdict}
        {actions.length > 0 && <ActionList actions={actions} t={t} locale={locale} />}
      </div>
    </ResultCard>
  );
}

function DomainView({ r, t }: { r: DomainResult; t: ScanDict }) {
  if (r.status === "invalid" || !r.domain) {
    return (
      <ResultCard label={t.domainResult}>
        <StateCard tone="warning" icon="?" title={t.invalidDomainTitle} badge="invalid">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">{t.invalidDomainText}</p>
        </StateCard>
      </ResultCard>
    );
  }
  return (
    <ResultCard label={<>{t.attackSurface} · <span className="font-mono text-ink-secondary">{r.domain}</span></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SubCard icon="◎" tone="brand" title={t.subTitle}
          badge={r.subdomains?.status === "ok" ? "ok" : "unavailable"}
          badgeTone={r.subdomains?.status === "ok" ? "brand" : "muted"}
          unavailable={r.subdomains?.status !== "ok"}
        >
          {r.subdomains?.status === "ok" ? (
            <>
              <div className="font-headline text-2xl text-ink-primary tabular-nums">{r.subdomains.count}</div>
              <div className="font-mono text-[11px] text-ink-muted">{t.subUnit}</div>
              <ul className="mt-2.5 space-y-1">
                {r.subdomains.sample.slice(0, 6).map((s) => (
                  <li key={s} className="truncate font-mono text-[12px] text-ink-secondary" title={s}>{s}</li>
                ))}
                {r.subdomains.count > 6 && <li className="font-mono text-[12px] text-ink-muted">{t.moreN(r.subdomains.count - 6)}</li>}
              </ul>
              <Source><b className="text-ink-secondary">certspotter + crt.sh</b></Source>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-secondary">{t.subUnavail}</p>
          )}
        </SubCard>

        <SubCard icon="▲"
          tone={r.exposure?.status === "ok" && r.exposure.vulns.length > 0 ? "critical" : "brand"}
          title={t.servicesTitle}
          badge={r.exposure?.status !== "ok" ? "unavailable" : !r.exposure.found ? t.notVisibleBadge : t.portBadge(r.exposure.ports.length)}
          badgeTone={r.exposure?.status !== "ok" ? "muted" : r.exposure.vulns.length > 0 ? "critical" : r.exposure.found ? "brand" : "good"}
          unavailable={r.exposure?.status !== "ok"}
        >
          {r.exposure?.status === "ok" ? (
            !r.exposure.found ? (
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t.noServices(r.exposure.ip ?? "")}</p>
            ) : (
              <>
                {r.exposure.vulns.length > 0 && <div className="font-headline text-2xl text-accent-critical tabular-nums">{t.cveCount(r.exposure.vulns.length)}</div>}
                <div className="font-mono text-[11px] text-ink-muted">{r.exposure.ip} · {t.openPorts}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.exposure.ports.slice(0, 10).map((p) => (
                    <span key={p} className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-ink-secondary">{p}</span>
                  ))}
                  {r.exposure.ports.length > 10 && <span className="font-mono text-[11px] text-ink-muted">+{r.exposure.ports.length - 10}</span>}
                </div>
                {r.exposure.vulns.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {r.exposure.vulns.slice(0, 6).map((v) => (
                      <a key={v} href={`https://nvd.nist.gov/vuln/detail/${v}`} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-accent-critical/40 bg-accent-critical/10 px-1.5 py-0.5 font-mono text-[10.5px] text-accent-critical hover:bg-accent-critical/20">{v}</a>
                    ))}
                    {r.exposure.vulns.length > 6 && <span className="font-mono text-[11px] text-ink-muted">+{r.exposure.vulns.length - 6}</span>}
                  </div>
                )}
                <Source><b className="text-ink-secondary">Shodan InternetDB</b></Source>
              </>
            )
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-secondary">{r.exposure?.ip === null ? t.servicesUnavailNoIp : t.servicesUnavailShodan}</p>
          )}
        </SubCard>

        <SubCard icon="◍" tone="warning" title={t.intelTitle}
          badge={r.mentions?.status === "ok" ? t.timesBadge(r.mentions.count) : "unavailable"}
          badgeTone={r.mentions?.status === "ok" ? "warning" : "muted"}
          unavailable={r.mentions?.status !== "ok"}
        >
          {r.mentions?.status === "ok" ? (
            <>
              <div className="font-headline text-2xl text-ink-primary tabular-nums">{r.mentions.count}</div>
              <div className="font-mono text-[11px] text-ink-muted">{t.intelDesc}</div>
              {r.mentions.stories.length > 0 ? (
                <div className="mt-2.5 space-y-2">
                  {r.mentions.stories.slice(0, 3).map((s) => (
                    <a key={s.url} href={s.url} className="block border-t border-hairline pt-2 first:border-t-0 first:pt-0 hover:opacity-90">
                      <div className="text-[13px] leading-snug text-ink-primary">{s.title}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-ink-muted">{s.source} · {fmtDate(s.published)}</div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-ink-secondary">{t.noCoverage}</p>
              )}
              <Source><b className="text-ink-secondary">ctiaze items</b></Source>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-secondary">{t.intelUnavail}</p>
          )}
        </SubCard>

        {r.watchlist ? (
          <SubCard icon="▲" tone="critical" title={t.watchlistTitle} badge={r.watchlist.product} badgeTone="critical">
            <div className="font-headline text-2xl text-accent-critical tabular-nums">~{r.watchlist.az_exposed.toLocaleString("en-US")}</div>
            <div className="font-mono text-[11px] text-ink-muted">{t.watchlistSeen(r.watchlist.product, r.watchlist.as_of)}</div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-secondary">{t.watchlistDesc}</p>
            <Source><b className="text-ink-secondary">Shodan AZ</b></Source>
          </SubCard>
        ) : (
          <SubCard icon="—" tone="muted" title={t.watchlistTitle} badge={t.watchlistNoMatch} badgeTone="muted" unavailable>
            <p className="text-[13px] leading-relaxed text-ink-secondary">{t.watchlistNoMatchDesc}</p>
          </SubCard>
        )}

        {r.emailSecurity && (
          <SubCard
            icon="✉"
            tone={emailSecStrong(r.emailSecurity) ? "good" : "warning"}
            title={t.emailSecTitle}
            badge={
              r.emailSecurity.status !== "ok"
                ? "unavailable"
                : r.emailSecurity.dmarc.present
                  ? `p=${r.emailSecurity.dmarc.policy ?? "?"}`
                  : "no dmarc"
            }
            badgeTone={r.emailSecurity.status !== "ok" ? "muted" : emailSecStrong(r.emailSecurity) ? "good" : "warning"}
            unavailable={r.emailSecurity.status !== "ok"}
          >
            {r.emailSecurity.status === "ok" ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <PostureChip label="MX" ok={r.emailSecurity.mx} />
                  <PostureChip label="SPF" ok={r.emailSecurity.spf.present} note={r.emailSecurity.spf.policy} />
                  <PostureChip
                    label="DMARC"
                    ok={r.emailSecurity.dmarc.policy === "quarantine" || r.emailSecurity.dmarc.policy === "reject"}
                    note={r.emailSecurity.dmarc.policy}
                  />
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-secondary">
                  {emailSecStrong(r.emailSecurity) ? t.emailSecStrong : t.emailSecWeak}
                </p>
                <Source><b className="text-ink-secondary">MX · SPF · DMARC</b></Source>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t.emailSecUnavail}</p>
            )}
          </SubCard>
        )}

        {r.infostealer && (
          <SubCard
            icon="☣"
            tone={r.infostealer.found ? "critical" : "good"}
            title={t.stealerDomTitle}
            badge={r.infostealer.status !== "ok" ? "unavailable" : r.infostealer.found ? t.timesBadge(r.infostealer.total) : "clean"}
            badgeTone={r.infostealer.status !== "ok" ? "muted" : r.infostealer.found ? "critical" : "good"}
            unavailable={r.infostealer.status !== "ok"}
          >
            {r.infostealer.status !== "ok" ? (
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t.intelUnavail}</p>
            ) : r.infostealer.found ? (
              <>
                <ul className="space-y-1 font-mono text-[12px]">
                  {r.infostealer.employees > 0 && <li className="text-accent-critical">▸ {t.stealerDomEmp(r.infostealer.employees)}</li>}
                  {r.infostealer.users > 0 && <li className="text-ink-secondary">▸ {t.stealerDomUsr(r.infostealer.users)}</li>}
                </ul>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{t.stealerDomDesc}</p>
                {r.infostealer.families.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.infostealer.families.map((f) => (
                      <span key={f} className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">{f}</span>
                    ))}
                  </div>
                )}
                <Source><b className="text-ink-secondary">Hudson Rock</b></Source>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t.stealerDomNone}</p>
            )}
          </SubCard>
        )}
      </div>
    </ResultCard>
  );
}

function emailSecStrong(es: NonNullable<EmailSecurity>): boolean {
  return es.status === "ok" && es.spf.present && (es.dmarc.policy === "quarantine" || es.dmarc.policy === "reject");
}

function PostureChip({ label, ok, note }: { label: string; ok: boolean; note?: string | null }) {
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[11px] ${ok ? "border-accent-good/40 bg-accent-good/[0.06] text-accent-good" : "border-accent-warning/40 bg-accent-warning/10 text-accent-warning"}`}>
      {ok ? "✓" : "✗"} {label}{note ? ` ${note}` : ""}
    </span>
  );
}

function ResultCard({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">{label}</h2>
        <span className="h-px flex-1 bg-hairline" />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const TONE_RING: Record<string, string> = {
  critical: "border-accent-critical/40 bg-accent-critical/[0.04]",
  good: "border-accent-good/40 bg-accent-good/[0.04]",
  warning: "border-accent-warning/40 bg-accent-warning/[0.04]",
  muted: "border-hairline bg-surface-raised/40",
};
const TONE_TEXT: Record<string, string> = {
  critical: "text-accent-critical", good: "text-accent-good", warning: "text-accent-warning",
  muted: "text-ink-muted", brand: "text-brand",
};

function StateCard({ tone, icon, title, badge, children }: {
  tone: "critical" | "good" | "warning" | "muted"; icon: string; title: string; badge: string; children: React.ReactNode;
}) {
  return (
    <article className={`rounded-md border ${TONE_RING[tone]}`}>
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-sm bg-surface ${TONE_TEXT[tone]}`}>{icon}</span>
        <h3 className="font-headline text-base text-ink-primary">{title}</h3>
        <span className={`ml-auto rounded-sm border border-hairline px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-widest ${TONE_TEXT[tone]}`}>{badge}</span>
      </div>
      <div className="px-4 py-4">{children}</div>
    </article>
  );
}

function SubCard({ icon, tone, title, badge, badgeTone, unavailable, children }: {
  icon: string; tone: "brand" | "warning" | "critical" | "good" | "muted"; title: string; badge: string;
  badgeTone: "brand" | "warning" | "critical" | "good" | "muted"; unavailable?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border p-4 ${unavailable ? "border-dashed border-hairline bg-surface-raised/20" : "border-hairline bg-surface-raised/40"}`}>
      <div className="flex items-center gap-2">
        <span className={`grid size-6 shrink-0 place-items-center rounded-sm bg-surface text-[13px] ${TONE_TEXT[tone]}`}>{icon}</span>
        <span className="text-[13.5px] font-semibold text-ink-primary">{title}</span>
        <span className={`ml-auto rounded-sm border border-hairline px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONE_TEXT[badgeTone]}`}>{badge}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
