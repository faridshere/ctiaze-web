import Link from "next/link";
import { GodEyeGlobe } from "@/components/GodEyeGlobe";

const nf = (n: number) => n.toLocaleString("en-US");

// Homepage hero: a live night-side god's-eye globe of the region behind a
// text-first value prop + CTA (readable with the canvas removed) and a live
// proof strip. Impeccable floor: no eyebrow/kicker, one signal-orange action
// per viewport, data set in mono only.
export function Hero({ archive, azHosts }: { archive: number; azHosts: number }) {
  const proof: [string, string][] = [
    [nf(archive), "indexed intel items"],
    [azHosts > 0 ? nf(azHosts) : "live", "regional hosts tracked"],
    ["every 2h", "pipeline refresh"],
    ["≥2 sources", "verified attribution"],
  ];
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline bg-[#06070B]">
      <GodEyeGlobe />
      {/* legibility overlays (dark the text side, vignette the edges) */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(125% 95% at 74% 44%, transparent 34%, rgba(6,7,11,0.5) 72%, rgba(6,7,11,0.94) 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 right-1/3" style={{ background: "linear-gradient(90deg, rgba(6,7,11,0.93) 0%, rgba(6,7,11,0.55) 58%, transparent 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 md:hidden" style={{ background: "linear-gradient(180deg, rgba(6,7,11,0.93) 0%, rgba(6,7,11,0.82) 30%, rgba(6,7,11,0.5) 52%, rgba(6,7,11,0.12) 68%, transparent 82%)" }} />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[86svh] w-full max-w-[75rem] items-start pt-[11vh] md:items-center md:pt-[var(--sp-section)] px-[var(--sp-gutter)] pb-[var(--sp-section)]">
        <div className="pointer-events-auto max-w-[38rem]">
          <h1 className="font-display text-[clamp(2.7rem,6.6vw,4.7rem)] font-semibold leading-[0.96] tracking-[-0.03em] text-[#EDF1F6]">
            See it. Nix it.
          </h1>
          <p className="mt-6 max-w-[33rem] text-[length:var(--t-body)] font-normal leading-relaxed text-[#9AA6B4]">
            Live threat intelligence for the Caucasus, Central Asia &amp; Türkiye — the attacks the global feeds miss, over a metered <span className="font-mono text-[#EDF1F6]">API</span> and <span className="font-mono text-[#EDF1F6]">MCP&nbsp;server</span>.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--brand)] px-5 py-3 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform hover:-translate-y-0.5" style={{ boxShadow: "0 12px 40px -8px rgba(255,90,31,0.5)" }}>
              Get an API key →
            </Link>
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[2px] border border-[#39424E] bg-[rgba(11,13,18,0.66)] px-5 py-3 font-display text-[length:var(--t-meta)] text-[#EDF1F6] backdrop-blur-sm transition-colors hover:border-[#4b5563] hover:bg-[rgba(20,24,31,0.7)]">
              Read the docs
            </Link>
          </div>

          {/* one skeptic handhold — the shape of the product, in one call */}
          <div className="mt-8 font-mono text-[length:var(--t-meta)] leading-[1.9] tabular-nums text-[#77828F]">
            <div><span className="text-[#6FD3E6]">$</span> <span className="text-[#9AA6B4]">curl</span> api.skopnix.io/v1/pulse</div>
            <div className="text-[#77828F]">&nbsp;→ &#123; &quot;region&quot;:<span className="text-[#EDF1F6]">&quot;caucasus&quot;</span>, &quot;active&quot;:<span className="text-[#EDF1F6]">1204</span>, &quot;nixed_24h&quot;:<span className="text-[#EDF1F6]">18446</span> &#125;</div>
          </div>
          <p className="mt-4 font-mono text-[length:var(--t-micro)] text-[#77828F]">First 1,000 calls free · no signup wall · cancel in one click</p>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 border-t border-[#1E252F] bg-[linear-gradient(180deg,transparent,rgba(6,7,11,0.72))]">
        <div className="mx-auto flex w-full max-w-[75rem] flex-wrap font-mono text-[#77828F]">
          {proof.map(([v, k], i) => (
            <div key={i} className="min-w-[150px] flex-1 border-l border-[#1E252F] px-[var(--sp-gutter)] py-3.5 first:border-l-0">
              <div className="text-[length:var(--t-row)] tabular-nums text-[#EDF1F6]">{v}</div>
              <div className="mt-0.5 text-[length:var(--t-micro)] uppercase tracking-[0.1em]">{k}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
