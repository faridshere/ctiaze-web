import Link from "next/link";
import { GodEyeGlobe } from "@/components/GodEyeGlobe";

const nf = (n: number) => n.toLocaleString("en-US");

// Homepage hero: a night-side god's-eye globe (global product) behind the value
// prop for the one thing skopnix sells — a worldwide threat-intel API + MCP with
// a regional data edge. The status line under the CTA is real, from getStats().
export function Hero({
  archive,
  kevCount,
  regionCount,
  en,
}: {
  archive: number;
  kevCount: number;
  regionCount: number;
  en: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline bg-[#06070B]">
      <GodEyeGlobe />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(125% 95% at 74% 44%, transparent 34%, rgba(6,7,11,0.5) 72%, rgba(6,7,11,0.94) 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 right-1/3" style={{ background: "linear-gradient(96deg, rgba(6,7,11,0.95) 0%, rgba(6,7,11,0.72) 30%, rgba(6,7,11,0.15) 58%, transparent 74%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 md:hidden" style={{ background: "linear-gradient(178deg, rgba(6,7,11,0.93) 0%, rgba(6,7,11,0.72) 34%, rgba(6,7,11,0.2) 60%, transparent 76%)" }} />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[86svh] w-full max-w-[75rem] items-start pt-[11vh] md:items-center md:pt-[var(--sp-section)] px-[var(--sp-gutter)] pb-[var(--sp-section)]">
        <div className="pointer-events-auto max-w-[39rem]">
          <h1 className="font-display text-[clamp(2.5rem,5.4vw,4rem)] font-semibold leading-[1.0] tracking-[-0.03em] text-[#EDF1F6] text-balance">
            {en ? "The world's threats, read straight off the wire." : "Dünyanın kibertəhlükələri — canlı xətdən oxunur."}
          </h1>
          <p className="mt-5 max-w-[32rem] font-normal text-[length:var(--t-body)] leading-relaxed text-[#9AA6B4]">
            {en ? (
              <>Global cyber-threat intelligence as an <b className="font-medium text-[#EDF1F6]">API</b> and <b className="font-medium text-[#EDF1F6]">MCP&nbsp;server</b>, grounded, cited, refreshed every couple of hours — with sensor depth in the regions the big feeds skip.</>
            ) : (
              <>Qlobal kibertəhlükə kəşfiyyatı — <b className="font-medium text-[#EDF1F6]">API</b> və <b className="font-medium text-[#EDF1F6]">MCP&nbsp;server</b> kimi. Mənbəyə qarşı yoxlanılır, hər bir neçə saatdan bir yenilənir — böyük feed-lərin ötdüyü regionlarda sensor dərinliyi ilə.</>
            )}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[3px] bg-[var(--brand)] px-5 py-3 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform hover:-translate-y-0.5">
              {en ? "Get an API key" : "API açarı al"} →
            </Link>
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[3px] border border-[#39424E] bg-[rgba(11,13,19,0.55)] px-5 py-3 font-display text-[length:var(--t-meta)] text-[#EDF1F6] backdrop-blur-sm transition-colors hover:border-[#4b5563]">
              {en ? "Read the docs" : "Sənədləri oxu"}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[length:var(--t-micro)] text-[#79838F]">
            <span><span className="mr-1.5 inline-block size-1.5 rounded-full bg-[var(--brand)] align-middle motion-safe:animate-pulse" /><span className="text-[var(--brand)]">{en ? "live" : "canlı"}</span> · {en ? "synced 2h ago" : "2s əvvəl sinxron"}</span>
            <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(archive)}</b> {en ? "briefings" : "brifinq"}</span>
            <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(kevCount)}</b> {en ? "on CISA KEV" : "CISA KEV-də"}</span>
            <span><b className="font-normal tabular-nums text-[#EDF1F6]">{nf(regionCount)}</b> {en ? "region-flagged" : "region işarəli"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
