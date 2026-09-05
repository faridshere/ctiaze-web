import Link from "next/link";
import { GodEyeGlobe } from "@/components/GodEyeGlobe";

const nf = (n: number) => n.toLocaleString("en-US");

// Homepage hero: a god's-eye globe under brushed aurora light on deep ink. The
// wordmark line "See it. Nix it." lifts in over it; one quiet action; the live
// state reads from the stats row itself. Nonchalant — no pitch, no sources.
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
  syncedLabel,
}: {
  archive: number;
  kevCount: number;
  syncedLabel: string;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline bg-[#05060a]">
      <div aria-hidden className="absolute inset-0 opacity-75">
        <GodEyeGlobe />
      </div>
      {STREAKS.map((st, i) => (
        <div key={i} aria-hidden className="aurora-streak pointer-events-none absolute rounded-full" style={{ ...st, filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: `${i * -3.2}s` }} />
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(90% 70% at 50% 42%, rgba(5,6,10,0.55) 0%, rgba(5,6,10,0.25) 55%, transparent 80%)" }} />

      <div className="relative z-10 mx-auto flex min-h-[84svh] w-full max-w-[75rem] flex-col items-center justify-center px-[var(--sp-gutter)] py-[var(--sp-section)] text-center">
        <h1 className="font-display text-[clamp(3rem,8vw,6rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-balance text-[#EDF1F6]">
          <span className="hl"><span>See it.</span></span>
          <span className="hl"><span>Nix it.</span></span>
        </h1>
        <p data-sc className="mx-auto mt-6 max-w-[34rem] text-[length:var(--t-body)] leading-relaxed text-[#9AA6B4]">
          The world&apos;s cyber threats, read straight off the wire — grounded, refreshed around the clock, nothing invented.
        </p>
        <div data-sc="2" className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/scan-me" className="inline-flex items-center gap-2 rounded-[3px] bg-[var(--brand)] px-5 py-3 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform hover:-translate-y-0.5">
            Scan your domain →
          </Link>
          <Link href="#wire" className="inline-flex items-center gap-2 rounded-[3px] border border-[#39424E] bg-[rgba(11,13,19,0.55)] px-5 py-3 font-display text-[length:var(--t-meta)] text-[#EDF1F6] backdrop-blur-sm transition-colors hover:border-[#4b5563]">
            See the wire ↓
          </Link>
        </div>
        <div data-sc="3" className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[length:var(--t-micro)] text-[#8A94A2]">
          <span><span className="signal-dot mr-1.5 inline-block size-1.5 rounded-full bg-[var(--brand)] align-middle" /><span className="text-[var(--brand)]">live</span> · {syncedLabel}</span>
          <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(archive)}</b> briefings</span>
          <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(kevCount)}</b> actively exploited</span>
        </div>
        <svg aria-hidden viewBox="0 0 32 32" className="mt-10 w-[104px] opacity-60" fill="none" strokeLinecap="round">
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
