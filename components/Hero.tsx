import Link from "next/link";
import { GodEyeGlobe } from "@/components/GodEyeGlobe";

const nf = (n: number) => n.toLocaleString("en-US");

// Homepage hero: a live god's-eye globe of the region behind a text-first value
// prop + CTA (readable with the canvas removed) and a live-proof stat strip.
export function Hero({ archive, azHosts }: { archive: number; azHosts: number }) {
  const proof: [string, string][] = [
    [nf(archive), "indexed intel items"],
    [azHosts > 0 ? nf(azHosts) : "live", "regional hosts tracked"],
    ["every 2h", "pipeline refresh"],
    ["≥2 sources", "no fabricated attribution"],
  ];
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline bg-[#05060A]">
      <GodEyeGlobe />
      {/* legibility overlays (dark the text side, vignette the edges) */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(125% 95% at 72% 46%, transparent 36%, rgba(5,6,10,0.55) 74%, rgba(5,6,10,0.95) 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 right-1/3" style={{ background: "linear-gradient(90deg, rgba(5,6,10,0.92) 0%, rgba(5,6,10,0.55) 60%, transparent 100%)" }} />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[86svh] w-full max-w-[75rem] items-center px-[var(--sp-gutter)] py-[var(--sp-section)]">
        <div className="pointer-events-auto max-w-[38rem]">
          <div className="mb-5 flex items-center gap-2.5 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.18em] text-[var(--brand)]">
            <span className="inline-block size-[6px] rounded-full bg-[var(--brand)]" style={{ boxShadow: "0 0 12px rgba(255,90,31,0.8)" }} />
            Sensor grid · Caucasus / Central Asia / Türkiye · Live
          </div>
          <h1 className="font-headline text-[clamp(2.6rem,6.4vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-[#EEF3F8]">
            See it. <span className="text-[var(--brand)]">Nix it.</span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[length:var(--t-body)] leading-relaxed text-[#AEB6C2]">
            Proprietary regional threat intelligence from <b className="font-medium text-[#EEF3F8]">our own honeypot sensor grid</b> — the attacks the global feeds miss. Query the one region no one else instruments, over a metered <span className="font-mono text-[var(--brand)]">API</span> and <span className="font-mono text-[var(--brand)]">MCP&nbsp;server</span>.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--brand)] px-5 py-3 font-mono text-[length:var(--t-meta)] font-semibold text-[#170a03] transition-transform hover:-translate-y-0.5" style={{ boxShadow: "0 12px 44px -8px rgba(255,90,31,0.6)" }}>
              Get an API key →
            </Link>
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[2px] border border-[#2A323D] bg-[rgba(18,22,28,0.5)] px-5 py-3 font-mono text-[length:var(--t-meta)] text-[#AEB6C2] backdrop-blur-sm transition-colors hover:border-[#465162] hover:text-[#EEF3F8]">
              Read the docs
            </Link>
          </div>
          <p className="mt-4 font-mono text-[length:var(--t-micro)] text-[#6A7383]">No signup wall · first 1,000 calls free · cancel in one click</p>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 border-t border-[#1E252F] bg-[linear-gradient(180deg,transparent,rgba(5,6,10,0.72))]">
        <div className="mx-auto flex w-full max-w-[75rem] flex-wrap font-mono text-[#6A7383]">
          {proof.map(([v, k], i) => (
            <div key={i} className="min-w-[150px] flex-1 border-l border-[#1E252F] px-[var(--sp-gutter)] py-3.5 first:border-l-0">
              <div className="text-[length:var(--t-row)] tabular-nums text-[#EEF3F8]">{v}</div>
              <div className="mt-0.5 text-[length:var(--t-micro)] uppercase tracking-[0.1em]">{k}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
