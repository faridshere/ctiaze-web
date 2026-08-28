import Link from "next/link";

const nf = (n: number) => n.toLocaleString("en-US");

// The commercial hero the review panel said was missing: a stranger must learn
// WHAT this is / WHO it's for / WHY it's not a toy — and find a CTA — in 5s.
// Austere "ink & signal": signal-orange for the primary action only, 2px radius,
// hairlines never shadows.
export function Hero({ archive, azHosts }: { archive: number; azHosts: number }) {
  const audience: [string, string][] = [
    ["For builders", "Regional threat data via API & MCP — your agent cites live intel, not a stale blog."],
    ["For analysts & MSSPs", "KEV-filtered feeds, source-cited actor dossiers, weekly regional exposure snapshots."],
    ["For researchers", "Free tools and reads — start with the IOC lookup or scan-me."],
  ];
  const proof: [string, string][] = [
    [nf(archive), "indexed intel items"],
    [azHosts > 0 ? nf(azHosts) : "live", "regional hosts tracked"],
    ["every 2h", "pipeline refresh"],
    ["≥2 sources", "no fabricated attribution"],
  ];
  return (
    <section className="relative overflow-hidden border-b border-hairline bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(58% 78% at 82% 26%, var(--brand-wash), transparent 68%)" }}
      />
      <div className="relative mx-auto grid w-full max-w-[75rem] gap-10 px-[var(--sp-gutter)] py-[var(--sp-section)] lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="max-w-[38rem]">
          <div className="mb-5 flex items-center gap-2.5 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.18em] text-[var(--brand)]">
            <span className="inline-block size-[6px] rounded-full bg-[var(--brand)]" />
            Sensor grid · Caucasus / Central Asia / Türkiye
          </div>
          <h1 className="font-headline text-[clamp(2.3rem,5.6vw,4rem)] font-semibold leading-[1.03] tracking-tight text-ink-primary">
            Threat intelligence for the region the global feeds miss.
          </h1>
          <p className="mt-6 text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            <b className="font-semibold text-ink-primary">skopnix</b> runs its own honeypot sensor grid across
            the Caucasus, Central Asia and Türkiye — live exposure data, IOCs and source-cited actor dossiers,
            delivered as a metered <span className="font-mono text-[var(--brand)]">API</span> and{" "}
            <span className="font-mono text-[var(--brand)]">MCP&nbsp;server</span> your tools — and your AI — can query.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/developers"
              className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--brand)] px-5 py-3 font-mono text-[length:var(--t-meta)] font-semibold text-[#170a03] transition-transform hover:-translate-y-0.5"
            >
              Get an API key →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-[2px] border border-hairline px-5 py-3 font-mono text-[length:var(--t-meta)] text-ink-secondary transition-colors hover:border-[var(--ink-muted)] hover:text-ink-primary"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 font-mono text-[length:var(--t-micro)] text-ink-muted">
            No signup wall · first 1,000 calls free · cancel in one click
          </p>
        </div>

        <div className="grid gap-2.5">
          {audience.map(([h, b]) => (
            <div key={h} className="border border-hairline bg-[var(--surface-raised)] p-4">
              <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-[var(--brand)]">{h}</div>
              <div className="mt-1.5 text-[length:var(--t-meta)] leading-snug text-ink-secondary">{b}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative border-t border-hairline">
        <div className="mx-auto flex w-full max-w-[75rem] flex-wrap font-mono text-ink-muted">
          {proof.map(([v, k], i) => (
            <div key={i} className="min-w-[150px] flex-1 border-l border-hairline px-[var(--sp-gutter)] py-3.5 first:border-l-0">
              <div className="text-[length:var(--t-row)] tabular-nums text-ink-primary">{v}</div>
              <div className="mt-0.5 text-[length:var(--t-micro)] uppercase tracking-[0.1em]">{k}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
