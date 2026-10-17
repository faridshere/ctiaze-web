import Link from "next/link";
import { StackCheck } from "@/components/stack/StackCheck";
import { cveCitedHeading } from "@/lib/citations";
import type { StackExample } from "@/lib/stack/example";
import type { PipelineHealth } from "@/lib/home-tool";
import { SITE_URL } from "@/lib/site";
import { AsOf } from "./AsOf";

// Page one's first module (2026-10-17): the stack check itself. The paste box
// runs the real check in the browser against /api/v1/stack; beside it, a
// pre-run example that is one real row of the cited map, read hourly
// (lib/home-tool.ts), never a per-request call. Under it the keyless curl and
// one quiet line of pipeline health. The front page stays hourly ISR.
export const POSITIONING = "Paste what you run. See what is being exploited right now, by whom — with the report that proves it.";

// One line that works as pasted: the API takes no key. Checked against the
// live endpoint on 2026-10-17 (14 KEV CVEs, 5 with cited actors, for this row).
export const STACK_CURL = `curl -s ${SITE_URL}/api/v1/stack -H 'content-type: application/json' -d '{"components":[{"vendor":"fortinet","name":"fortios","version":"7.0.1"}]}'`;

const pct = (x: number) => `${(x * 100).toFixed(x >= 0.1 ? 0 : 1)}%`;

function shortDate(d: string | null): string | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return null;
  return new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function ExampleResult({ ex, refIso }: { ex: StackExample; refIso: string }) {
  const added = shortDate(ex.kevAdded);
  const cited = shortDate(ex.citedAt);
  return (
    <div data-stack-example>
      <div className="rule-b flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-2">
        <h2 className="label text-ink">Example · a real result</h2>
        <AsOf iso={ex.generatedAt} refIso={refIso} />
      </div>
      <p className="mt-3 font-mono text-[12px] text-ink-3">
        pasted: <span className="text-ink">{`${ex.vendor} ${ex.product}`}</span>
      </p>
      <div className="row pb-3 pt-2" data-sev="kev">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link href={`/cve/${ex.cve}`} className="num ulink whitespace-nowrap font-mono text-[15px] text-ink">
            {ex.cve}
          </Link>
          <span className="stamp">KEV{added ? ` · ${added}` : ""}</span>
          {ex.ransomware && <span className="stamp stamp-ink">ransomware use</span>}
          <span className={`num font-mono text-[12px] ${ex.epss >= 0.1 ? "text-caution" : "text-ink-3"}`}>EPSS {pct(ex.epss)}</span>
        </div>
      </div>
      <div className="mt-3">
        <span className="label text-ink">{cveCitedHeading([ex.relation])}</span>
        <div className="mt-1 border-l-2 border-ink pl-3">
          {ex.actor.dossier ? (
            <Link href={`/actors/${ex.actor.id}`} className="label ulink text-ink">
              {ex.actor.name}
            </Link>
          ) : (
            <span className="label text-ink">{ex.actor.name}</span>
          )}
          <blockquote className="mt-1 text-[14px] leading-snug text-ink-2 [overflow-wrap:anywhere]">“{ex.quote}”</blockquote>
          <p className="mt-1 font-mono text-[11px] text-ink-3">
            <a href={ex.href} target="_blank" rel="nofollow noopener noreferrer" className="ulink [overflow-wrap:anywhere] hover:text-ink">
              {ex.sourceLabel} ↗
            </a>
            {cited && ` · read ${cited}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StackDesk({ example, health, refIso }: { example: StackExample | null; health: PipelineHealth | null; refIso: string }) {
  return (
    <section id="stack" className="sheet pt-6 sm:pt-7" aria-labelledby="stack-head" data-stack-desk>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="label text-ink">Stack check · free · no signup</p>
        <p className="label text-ink-3">CISA KEV · NVD ranges · FIRST EPSS · actors cited with source</p>
      </div>
      <h1 id="stack-head" className="headline mt-3 text-[clamp(1.55rem,2.9vw,2.35rem)] text-ink">
        {POSITIONING}
      </h1>
      <div className="mt-5">
        <StackCheck compact aside={example ? <ExampleResult ex={example} refIso={refIso} /> : undefined} />
      </div>
      <div className="rule-soft mt-6 grid gap-4 pt-3 md:grid-cols-12 md:gap-6">
        <div className="min-w-0 md:col-span-7">
          <p className="label text-ink">No key. curl it.</p>
          <pre className="num mt-2 whitespace-pre-wrap border border-rule-soft bg-paper-deep px-3 py-2 font-mono text-[11.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
            <code data-stack-curl>{STACK_CURL}</code>
          </pre>
          <p className="mt-1.5 font-mono text-[11px] text-ink-3">
            JSON back · 500 components a call · 10 checks a minute per IP ·{" "}
            <Link href="/api-docs" className="ulink hover:text-ink">
              API docs
            </Link>
          </p>
        </div>
        {health && (
          <p className="self-end font-mono text-[11px] leading-relaxed text-ink-3 md:col-span-5 md:text-right" data-pipeline-health>
            Pipeline: {health.sources24h.toLocaleString("en-US")} sources delivered in the last 24 h ·{" "}
            {health.citedPairs.toLocaleString("en-US")} cited CVE–actor pairs · <AsOf iso={health.generatedAt} refIso={refIso} className="text-[11px]" />
          </p>
        )}
      </div>
    </section>
  );
}
