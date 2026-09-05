import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/_disabled/Header";
import { Footer } from "@/components/_disabled/Footer";
import { getLocale } from "@/lib/_disabled/i18n-server";
import { localizedMeta } from "@/lib/_disabled/seo";

export const revalidate = 86400;

const EARLY = "mailto:hello@skopnix.com?subject=skopnix%20API%20early%20access";

export async function generateMetadata(
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/developers", en,
    azTitle: "Developers — API & MCP — skopnix",
    enTitle: "Developers — API & MCP — skopnix",
    azDesc: "Regional təhlükə kəşfiyyatını API və MCP server vasitəsilə sorğula. Mənbə göstərilən nəticələr, JSON, tər tər izlənə bilən.",
    enDesc: "Query regional threat intelligence over a metered API and MCP server. Cited verdicts, stable permalinks, built for agents and SOC tooling.",
  });
}

const ENDPOINTS: [string, string, string][] = [
  ["GET", "/v1/cve/{id}", "Exploitation status, KEV/EPSS, regional observation — a sourced verdict."],
  ["GET", "/v1/actor/{slug}", "Aliases, ATT&CK TTPs, regional targeting, confidence + citations."],
  ["GET", "/v1/ioc/{indicator}", "IP / domain / hash → verdict + provenance from our sensors."],
  ["GET", "/v1/exposure/{country}", "Regional attack-surface snapshot — hosts, risky services, deltas."],
  ["GET", "/v1/search?q=", "Free-text over the corpus → cited snippets + stable permalinks."],
];

const MCP_TOOLS: [string, string][] = [
  ["lookup_cve", "free"],
  ["lookup_actor", "free"],
  ["search_intel", "free"],
  ["enrich_ioc", "paid — sensor-backed"],
  ["regional_threat_lookup", "paid — sensor-backed"],
];

export default async function DevelopersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-[75rem] flex-1 px-[var(--sp-gutter)] py-[var(--sp-section)]">
        <div className="max-w-[44rem]">
          <div className="mb-4">
            <span className="rounded-[2px] border border-hairline px-2 py-0.5 font-mono text-[length:var(--t-micro)] uppercase tracking-wider text-ink-muted">Private beta</span>
          </div>
          <h1 className="font-headline text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.05] tracking-tight text-ink-primary">
            Query the region, from your code or your agent.
          </h1>
          <p className="mt-5 text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            One metered API and one MCP server. Every response is a <b className="text-ink-primary">cited verdict</b> —
            with confidence, sources and stable permalinks — and <span className="font-mono text-[var(--brand)]">&quot;unknown&quot;</span> is
            a first-class answer, never a guess. That is honesty-first, expressed in JSON.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={EARLY} className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--brand)] px-5 py-3 font-mono text-[length:var(--t-meta)] font-semibold text-[#170a03] transition-transform hover:-translate-y-0.5">Request a key →</a>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-[2px] border border-hairline px-5 py-3 font-mono text-[length:var(--t-meta)] text-ink-secondary transition-colors hover:border-[var(--ink-muted)] hover:text-ink-primary">Pricing</Link>
          </div>
        </div>

        {/* sample call */}
        <div className="mt-9 overflow-hidden border border-hairline bg-[var(--surface-raised)]">
          <div className="border-b border-hairline px-4 py-2 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] text-ink-muted">
            Your first call
          </div>
          <pre className="overflow-x-auto px-4 py-4 font-mono text-[length:var(--t-meta)] leading-relaxed text-ink-secondary"><code>{`curl https://api.skopnix.com/v1/exposure/az/latest \\
  -H "Authorization: Bearer sk_live_..."

# → { "country": "AZ", "as_of": "2026-08-28T…Z",
#     "hosts": 114527, "risky": { "rdp": 444, "smb": 210 },
#     "sources": [ … ], "confidence": "high" }`}</code></pre>
        </div>

        {/* endpoints */}
        <h2 className="mt-11 font-headline text-[length:var(--t-h2)] font-semibold text-ink-primary">REST endpoints</h2>
        <div className="mt-4 divide-y divide-[var(--hairline)] border border-hairline bg-[var(--surface-raised)]">
          {ENDPOINTS.map(([m, path, desc]) => (
            <div key={path} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:gap-4">
              <div className="flex shrink-0 items-center gap-3 md:w-[19rem]">
                <span className="rounded-[2px] bg-[var(--brand-wash)] px-2 py-0.5 font-mono text-[length:var(--t-micro)] font-semibold text-[var(--brand)]">{m}</span>
                <code className="font-mono text-[length:var(--t-meta)] text-ink-primary">{path}</code>
              </div>
              <span className="text-[length:var(--t-meta)] leading-snug text-ink-secondary">{desc}</span>
            </div>
          ))}
        </div>

        {/* MCP */}
        <h2 className="mt-11 font-headline text-[length:var(--t-h2)] font-semibold text-ink-primary">MCP server</h2>
        <p className="mt-3 max-w-[44rem] text-[length:var(--t-meta)] leading-relaxed text-ink-secondary">
          Add regional threat intel to Claude, Cursor or your own agent in one line. Public tools are free;
          the sensor-backed tools need a paid key.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden border border-hairline bg-[var(--surface-raised)]">
            <div className="border-b border-hairline px-4 py-2 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] text-ink-muted">Install</div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[length:var(--t-meta)] text-ink-secondary"><code>{`{
  "mcpServers": {
    "skopnix": {
      "url": "https://mcp.skopnix.com",
      "headers": { "Authorization": "Bearer sk_..." }
    }
  }
}`}</code></pre>
          </div>
          <div className="border border-hairline bg-[var(--surface-raised)]">
            <div className="border-b border-hairline px-4 py-2 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] text-ink-muted">Tools</div>
            <ul>
              {MCP_TOOLS.map(([tool, tag]) => (
                <li key={tool} className="flex items-center justify-between border-b border-hairline px-4 py-2.5 last:border-b-0">
                  <code className="font-mono text-[length:var(--t-meta)] text-ink-primary">{tool}</code>
                  <span className={`font-mono text-[length:var(--t-micro)] uppercase tracking-[0.08em] ${tag === "free" ? "text-ink-muted" : "text-[var(--brand)]"}`}>{tag}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-start gap-4 border border-[var(--brand)] bg-[var(--surface-raised)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-headline text-[length:var(--t-h2)] font-semibold text-ink-primary">Want early access?</div>
            <p className="mt-1 text-[length:var(--t-meta)] text-ink-secondary">The API is in private beta. Get a key while coverage is landing — early keys keep their rate.</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <a href={EARLY} className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--brand)] px-5 py-3 font-mono text-[length:var(--t-meta)] font-semibold text-[#170a03] transition-transform hover:-translate-y-0.5">Request a key →</a>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-[2px] border border-hairline px-5 py-3 font-mono text-[length:var(--t-meta)] text-ink-secondary transition-colors hover:border-[var(--ink-muted)] hover:text-ink-primary">Pricing</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
