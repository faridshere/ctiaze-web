import type { HomeData } from "@/lib/home-data";
import { Panel } from "@/components/site/Panel";
import { Button } from "@/components/site/Button";
import { SITE_URL, LINKS } from "@/lib/site";
import { Sparkline } from "./Sparkline";

// Three numbered pillars in the xintra rhythm — number, title, one line — but
// each carries a real artefact instead of a stock photo: the last fortnight of
// dispatches, the archive total, and a curl against the feed that works today.
function Index({ n }: { n: string }) {
  return <span className="font-mono text-[12px] tracking-[0.18em] text-ink-muted">{n}</span>;
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-3 font-display text-[1.6rem] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-primary">
      {children}
    </h3>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-[26rem] text-[14.5px] leading-relaxed text-ink-secondary">{children}</p>;
}

export function Pillars({ data }: { data: HomeData }) {
  const week = data.week.dispatches;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel interactive className="flex flex-col p-6 sm:p-7">
        <Index n="01" />
        <Title>The wire</Title>
        <Line>
          Every report that matters, filed within hours of the source, read in one line. Actively-exploited CVEs get flagged, not buried.
        </Line>
        <div className="mt-auto pt-8">
          <Sparkline data={data.daily} className="h-16 w-full" />
          <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <span>14 days</span>
            <span>{week.toLocaleString("en-US")} this week</span>
          </div>
        </div>
      </Panel>

      <Panel interactive className="flex flex-col p-6 sm:p-7">
        <Index n="02" />
        <Title>The archive</Title>
        <Line>
          Every dispatch ever published, newest first, each one grounded to the outlet that broke it — and to the others that carried it.
        </Line>
        <div className="mt-auto pt-8">
          <div className="font-display text-[3.4rem] font-semibold leading-none tracking-[-0.04em] text-ink-primary">
            {data.total.toLocaleString("en-US")}
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <span>dispatches on file</span>
            <Button href="/news" variant="ghost" size="sm" glyph="→">
              Browse
            </Button>
          </div>
        </div>
      </Panel>

      <Panel interactive className="flex flex-col p-6 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(255,90,31,0.22) 0%, rgba(255,90,31,0.05) 45%, transparent 75%)" }}
        />
        <div className="relative flex items-center justify-between">
          <Index n="03" />
          <span className="rounded-[var(--radius-chip)] border border-brand/40 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.14em] text-brand">
            coming
          </span>
        </div>
        <Title>The API + MCP</Title>
        <Line>
          The same wire as JSON for your tools and your agents. The public feed is already live; keys for the full API open with early access.
        </Line>
        <div className="relative mt-auto pt-8">
          <pre className="overflow-x-auto rounded-[var(--radius-btn)] border border-hairline bg-void/70 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-ink-secondary">
            <code>{`curl ${SITE_URL}${LINKS.jsonFeed}\n{ "version": "https://jsonfeed.org/version/1.1",\n  "items": [ { "title": "…", "_skopnix": { "kev": true } } ] }`}</code>
          </pre>
        </div>
      </Panel>
    </div>
  );
}
