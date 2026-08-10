"use client";

import { useState } from "react";

type EmailResult = {
  kind: "email";
  status: "ok" | "unavailable" | "invalid";
  breaches: string[];
  count: number;
  source: string;
  fetched_at: string | null;
};
type SubBlock = { status: "ok" | "unavailable"; count: number; sample: string[]; source: string; fetched_at: string };
type MentionStory = { title: string; url: string; source: string; published: string | null };
type MentionBlock = { status: "ok" | "unavailable"; count: number; stories: MentionStory[]; source: string; fetched_at: string };
type WatchBlock = { product: string; az_exposed: number; as_of: string; source: string; fetched_at: string } | null;
type DomainResult = {
  kind: "domain";
  domain: string | null;
  status: "ok" | "invalid";
  subdomains: SubBlock | null;
  mentions: MentionBlock | null;
  watchlist: WatchBlock;
};
type ScanResult = EmailResult | DomainResult;

const EXAMPLES = ["namiq@example.az", "example.az"];

export function ScanMe() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  async function run(term: string) {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/scan?q=${encodeURIComponent(term)}`);
      const data = await r.json();
      if (!r.ok) setError(data.error || "Xəta baş verdi");
      else setResult(data as ScanResult);
    } catch {
      setError("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* scanner console */}
      <div className="overflow-hidden rounded-md border border-hairline bg-surface-raised/40">
        <div className="flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="size-2.5 rounded-full bg-accent-critical/80" />
            <i className="size-2.5 rounded-full bg-accent-warning/80" />
            <i className="size-2.5 rounded-full bg-accent-good/80" />
          </span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-muted">
            ctiaze scan · e-poçt və ya domain
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) run(q.trim());
          }}
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
              placeholder="namiq@example.az  və ya  example.az"
              aria-label="E-poçt və ya domain"
              className="w-full rounded-sm border border-hairline bg-surface py-2.5 pl-8 pr-3.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="rounded-sm bg-brand px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "…" : "Yoxla"}
          </button>
        </form>

        <p className="px-4 pb-4 font-mono text-[11px] text-ink-muted">
          <span className="text-ink-secondary">@</span> varsa → e-poçt breach yoxlaması ·
          yoxdursa → domain attack surface.{" "}
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
        <p className="mt-5 font-mono text-xs text-ink-secondary">
          <span className="text-accent-good">●</span> skan edilir…
        </p>
      )}
      {error && <p className="mt-5 font-mono text-xs text-accent-critical">{error}</p>}
      {result && !loading && (result.kind === "email" ? <EmailView r={result} /> : <DomainView r={result} />)}

      {/* the honesty rule, always visible — the product's core promise */}
      <div className="mt-6 rounded-md border border-hairline bg-surface-raised/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">◑</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Dürüstlük qaydası</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
          Servis cavab vermədikdə sənə <b className="text-ink-primary">«təmizsən»</b> demirik — çünki
          bunu bilmirik. Bunun əvəzinə açıq şəkildə <span className="font-mono text-ink-muted">unavailable</span>{" "}
          qaytarırıq. Səhv «breach yoxdur» susmaqdan pisdir. E-poçt ünvanın yalnız bir sorğu üçün
          istifadə olunur — heç yerdə saxlanmır.
        </p>
      </div>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}
function Source({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 border-t border-dashed border-hairline pt-3 font-mono text-[11px] text-ink-muted">
      <span aria-hidden="true">🛈</span>
      <span>{children}</span>
    </div>
  );
}

// ------------------------------------------------------------------- email result
function EmailView({ r }: { r: EmailResult }) {
  if (r.status === "invalid") {
    return (
      <ResultCard label="E-poçt nəticəsi">
        <StateCard tone="warning" icon="?" title="Düzgün e-poçt yaz" badge="invalid">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">
            Bu, düzgün formatda e-poçt ünvanı deyil, ona görə heç bir sorğu göndərilmədi.
          </p>
        </StateCard>
      </ResultCard>
    );
  }
  if (r.status === "unavailable") {
    return (
      <ResultCard label="E-poçt nəticəsi">
        <StateCard tone="muted" icon="◑" title="Breach servisi əlçatan deyil" badge="unavailable">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">
            XposedOrNot hazırda cavab vermir. Sənə «təmizsən» demirik — bunu bilmirik. Bir azdan
            yenidən yoxla.
          </p>
          <Source>
            Mənbə: <b className="text-ink-secondary">XposedOrNot</b> · cavab alınmadı ·{" "}
            <span>{fmtDate(r.fetched_at)}</span>
          </Source>
        </StateCard>
      </ResultCard>
    );
  }
  // ok
  if (r.count === 0) {
    return (
      <ResultCard label="E-poçt nəticəsi">
        <StateCard tone="good" icon="✓" title="Məlum breach-lərdə görünmür" badge="təmiz">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">
            Bu ünvan XposedOrNot-un breach bazasında tapılmadı. Bu, siyahıya əsaslanan nəticədir —
            «heç vaxt sızmayacaq» zəmanəti deyil. Yenə də hər servisdə güclü parol və{" "}
            <span className="font-mono">2FA</span> saxla.
          </p>
          <Source>
            Mənbə: <b className="text-ink-secondary">XposedOrNot</b> ·{" "}
            <span className="font-mono">api.xposedornot.com/v1/check-email</span> · {fmtDate(r.fetched_at)}
          </Source>
        </StateCard>
      </ResultCard>
    );
  }
  return (
    <ResultCard label="E-poçt nəticəsi">
      <StateCard tone="critical" icon="⚠" title="Breach yoxlaması" badge={`tapıldı · ${r.count}`}>
        <div className="font-headline text-3xl text-accent-critical">
          {r.count} breach
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
          Bu ünvan aşağıdakı təsdiqlənmiş data breach-lərdə görünüb. Bu servislərdəki parolu dəyiş
          və <span className="font-mono">2FA</span> aktiv et.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {r.breaches.map((b) => (
            <span
              key={b}
              className="rounded-sm border border-accent-critical/40 bg-accent-critical/10 px-2.5 py-1 font-mono text-[12px] text-accent-critical"
            >
              {b}
            </span>
          ))}
        </div>
        <Source>
          Mənbə: <b className="text-ink-secondary">XposedOrNot</b> ·{" "}
          <span className="font-mono">api.xposedornot.com/v1/check-email</span> · {fmtDate(r.fetched_at)}
        </Source>
      </StateCard>
    </ResultCard>
  );
}

// ------------------------------------------------------------------ domain result
function DomainView({ r }: { r: DomainResult }) {
  if (r.status === "invalid" || !r.domain) {
    return (
      <ResultCard label="Domain nəticəsi">
        <StateCard tone="warning" icon="?" title="Düzgün domain yaz" badge="invalid">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">
            Bu, düzgün domain deyil, ona görə heç bir sorğu göndərilmədi. Nümunə:{" "}
            <span className="font-mono">example.az</span>
          </p>
        </StateCard>
      </ResultCard>
    );
  }
  return (
    <ResultCard label={<>Domain attack surface · <span className="font-mono text-ink-secondary">{r.domain}</span></>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* (a) subdomains */}
        <SubCard
          icon="◎"
          tone="brand"
          title="Subdomain-lar"
          badge={r.subdomains?.status === "ok" ? "ok" : "unavailable"}
          badgeTone={r.subdomains?.status === "ok" ? "brand" : "muted"}
          unavailable={r.subdomains?.status !== "ok"}
        >
          {r.subdomains?.status === "ok" ? (
            <>
              <div className="font-headline text-2xl text-ink-primary tabular-nums">{r.subdomains.count}</div>
              <div className="font-mono text-[11px] text-ink-muted">CT log-larında görünən ad</div>
              <ul className="mt-2.5 space-y-1">
                {r.subdomains.sample.slice(0, 4).map((s) => (
                  <li key={s} className="truncate font-mono text-[12px] text-ink-secondary" title={s}>{s}</li>
                ))}
                {r.subdomains.count > 4 && (
                  <li className="font-mono text-[12px] text-ink-muted">+ daha {r.subdomains.count - 4}</li>
                )}
              </ul>
              <Source><b className="text-ink-secondary">crt.sh</b> certificate transparency</Source>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-secondary">
              crt.sh cavab vermədi — «0 subdomain» demirik, sadəcə indi yoxlaya bilmədik.
            </p>
          )}
        </SubCard>

        {/* (b) our own coverage */}
        <SubCard
          icon="◍"
          tone="warning"
          title="Bizim intel"
          badge={r.mentions?.status === "ok" ? `${r.mentions.count} dəfə` : "unavailable"}
          badgeTone={r.mentions?.status === "ok" ? "warning" : "muted"}
          unavailable={r.mentions?.status !== "ok"}
        >
          {r.mentions?.status === "ok" ? (
            <>
              <div className="font-headline text-2xl text-ink-primary tabular-nums">{r.mentions.count}</div>
              <div className="font-mono text-[11px] text-ink-muted">@ctiaze bu domain-i xatırlayıb</div>
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
                <p className="mt-2 text-[13px] text-ink-secondary">Bu domain haqqında hələ yazımız yoxdur.</p>
              )}
              <Source><b className="text-ink-secondary">ctiaze items</b> · exact-domain, word-boundary</Source>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-secondary">
              Baza hazırda əlçatan deyil — yoxlaya bilmədik.
            </p>
          )}
        </SubCard>

        {/* (c) watchlist — optional */}
        {r.watchlist ? (
          <SubCard icon="▲" tone="critical" title="Shodan watchlist" badge={r.watchlist.product} badgeTone="critical">
            <div className="font-headline text-2xl text-accent-critical tabular-nums">
              ~{r.watchlist.az_exposed.toLocaleString("en-US")}
            </div>
            <div className="font-mono text-[11px] text-ink-muted">
              Azərbaycanda görünən {r.watchlist.product} ({r.watchlist.as_of})
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-secondary">
              Domain kütləvi istismar olunan bir product-la üst-üstə düşür — regional exposure yüksəkdir.
            </p>
            <Source><b className="text-ink-secondary">Shodan AZ</b> exposure snapshot</Source>
          </SubCard>
        ) : (
          <SubCard icon="—" tone="muted" title="Watchlist" badge="uyğunluq yox" badgeTone="muted" unavailable>
            <p className="text-[13px] leading-relaxed text-ink-secondary">
              Bu domain izlənən kütləvi-istismar product-larından birini adlandırmır — ona görə burada
              dayanacaq bir şey yoxdur.
            </p>
          </SubCard>
        )}
      </div>
    </ResultCard>
  );
}

// ------------------------------------------------------------------- shared bits
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
  critical: "text-accent-critical",
  good: "text-accent-good",
  warning: "text-accent-warning",
  muted: "text-ink-muted",
  brand: "text-brand",
};

function StateCard({
  tone, icon, title, badge, children,
}: {
  tone: "critical" | "good" | "warning" | "muted";
  icon: string;
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`rounded-md border ${TONE_RING[tone]}`}>
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-sm bg-surface ${TONE_TEXT[tone]}`}>{icon}</span>
        <h3 className="font-headline text-base text-ink-primary">{title}</h3>
        <span className={`ml-auto rounded-sm border border-hairline px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-widest ${TONE_TEXT[tone]}`}>
          {badge}
        </span>
      </div>
      <div className="px-4 py-4">{children}</div>
    </article>
  );
}

function SubCard({
  icon, tone, title, badge, badgeTone, unavailable, children,
}: {
  icon: string;
  tone: "brand" | "warning" | "critical" | "muted";
  title: string;
  badge: string;
  badgeTone: "brand" | "warning" | "critical" | "muted";
  unavailable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border p-4 ${unavailable ? "border-dashed border-hairline bg-surface-raised/20" : "border-hairline bg-surface-raised/40"}`}>
      <div className="flex items-center gap-2">
        <span className={`grid size-6 shrink-0 place-items-center rounded-sm bg-surface text-[13px] ${TONE_TEXT[tone]}`}>{icon}</span>
        <span className="text-[13.5px] font-semibold text-ink-primary">{title}</span>
        <span className={`ml-auto rounded-sm border border-hairline px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONE_TEXT[badgeTone]}`}>
          {badge}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
