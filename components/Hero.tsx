import Link from "next/link";

const nf = (n: number) => n.toLocaleString("en-US");

// Homepage hero, aurora register (the xintra.org reference Farid recorded):
// brushed light-streaks on deep ink, centered display type, one signal CTA,
// the wireframe triad floating beneath. The status line stays real (getStats).
const STREAKS: React.CSSProperties[] = [
  { width: 1600, height: 330, left: -220, top: 40, background: "linear-gradient(100deg, transparent 5%, rgba(38,90,150,0.5) 30%, rgba(111,211,230,0.46) 52%, rgba(38,70,140,0.32) 72%, transparent 95%)" },
  { width: 1500, height: 210, left: -120, top: 240, background: "linear-gradient(100deg, transparent 8%, rgba(111,211,230,0.38) 40%, rgba(150,200,235,0.3) 60%, transparent 92%)" },
  { width: 1300, height: 170, left: 200, top: -70, background: "linear-gradient(100deg, transparent, rgba(60,60,140,0.36) 45%, rgba(111,150,230,0.26) 65%, transparent)" },
  { width: 1200, height: 150, left: 60, top: 400, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.14) 45%, rgba(255,140,80,0.09) 62%, transparent)" },
  { width: 900, height: 120, right: -150, top: 130, background: "linear-gradient(100deg, transparent, rgba(111,211,230,0.22) 50%, transparent)" },
];

export function Hero({
  archive,
  kevCount,
  regionCount,
  en,
  syncedLabel,
}: {
  archive: number;
  kevCount: number;
  regionCount: number;
  en: boolean;
  syncedLabel: string;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline bg-[#05060a]">
      {STREAKS.map((st, i) => (
        <div key={i} aria-hidden className="aurora-streak pointer-events-none absolute rounded-full" style={{ ...st, filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: `${i * -3.2}s` }} />
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(140% 100% at 50% 120%, rgba(5,6,10,0.95) 18%, rgba(5,6,10,0.4) 45%, transparent 70%)" }} />

      <div className="relative z-10 mx-auto flex min-h-[92svh] w-full max-w-[75rem] flex-col items-center justify-center px-[var(--sp-gutter)] py-[var(--sp-section)] text-center">
        <p data-sc className="mb-6 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.28em] text-[#9AA6B4]">
          {en ? "The wire is live" : "Xətt canlıdır"}
        </p>
        <h1 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[#EDF1F6]">
          <span className="hl"><span>{en ? "The world's threats," : "Dünyanın kibertəhlükələri —"}</span></span>
          <span className="hl"><span>{en ? "read straight off the wire." : "canlı xətdən oxunur."}</span></span>
        </h1>
        <p data-sc className="mx-auto mt-6 max-w-[36rem] text-[length:var(--t-body)] leading-relaxed text-[#9AA6B4]">
          {en ? (
            <>Global cyber-threat intelligence as an <b className="font-medium text-[#EDF1F6]">API</b> and <b className="font-medium text-[#EDF1F6]">MCP&nbsp;server</b> — grounded, cited, refreshed every couple of hours.</>
          ) : (
            <>Qlobal kibertəhlükə kəşfiyyatı — <b className="font-medium text-[#EDF1F6]">API</b> və <b className="font-medium text-[#EDF1F6]">MCP&nbsp;server</b> kimi. Mənbəyə qarşı yoxlanılır, hər bir neçə saatdan bir yenilənir.</>
          )}
        </p>
        <div data-sc="2" className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/developers" className="inline-flex items-center gap-2 rounded-[3px] bg-[var(--brand)] px-5 py-3 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform hover:-translate-y-0.5">
            {en ? "Get an API key" : "API açarı al"} →
          </Link>
          <Link href="/developers" className="inline-flex items-center gap-2 rounded-[3px] border border-[#39424E] bg-[rgba(11,13,19,0.55)] px-5 py-3 font-display text-[length:var(--t-meta)] text-[#EDF1F6] backdrop-blur-sm transition-colors hover:border-[#4b5563]">
            {en ? "Read the docs" : "Sənədləri oxu"}
          </Link>
        </div>
        <p data-sc="2" className="mt-4 font-mono text-[length:var(--t-micro)] text-[#8A94A2]">
          {en ? "First 1,000 calls free · no signup wall · cancel in one click" : "İlk 1,000 sorğu pulsuz · qeydiyyat divarı yoxdur · bir kliklə ləğv"}
        </p>
        <div data-sc="3" className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[length:var(--t-micro)] text-[#8A94A2]">
          <span><span className="signal-dot mr-1.5 inline-block size-1.5 rounded-full bg-[var(--brand)] align-middle" /><span className="text-[var(--brand)]">{en ? "live" : "canlı"}</span> · {syncedLabel}</span>
          <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(archive)}</b> {en ? "briefings" : "brifinq"}</span>
          <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(kevCount)}</b> {en ? "on CISA KEV" : "CISA KEV-də"}</span>
          <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(regionCount)}</b> {en ? "region-flagged" : "region işarəli"}</span>
        </div>
        <svg aria-hidden viewBox="0 0 32 32" className="mt-12 w-[104px] opacity-60" fill="none" strokeLinecap="round">
          <g stroke="#8fa8c8" strokeWidth="0.55">
            <path d="M16 15.5 L16 8.2" /><path d="M16 15.5 L8.6 21.4" /><path d="M16 15.5 L23.4 21.4" />
            <circle cx="16" cy="15.5" r="2.9" /><circle cx="8" cy="22" r="3.3" /><circle cx="24" cy="22" r="3.3" />
          </g>
          <circle className="triad-pulse" cx="16" cy="7" r="3.6" stroke="#FF5A1F" strokeWidth="0.7" />
        </svg>
      </div>
    </section>
  );
}
