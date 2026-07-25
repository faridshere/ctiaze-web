import { formatStoryDate } from "@/lib/format";

// A slim operational-telemetry strip under the masthead. Everything shown is
// real and honest — no fake "threat level" meter: monitoring status, the
// source count, how many dispatches exist, KEV count, and when the last one
// landed. This is the site's CTI signature: it reads like a console status
// line, because the thing behind it genuinely is an always-on monitor.
export function DispatchBar({
  total,
  kev,
  lastDispatchIso,
}: {
  total: number;
  kev: number;
  lastDispatchIso: string | null;
}) {
  const last = lastDispatchIso ? formatStoryDate(lastDispatchIso) : null;

  return (
    <div className="relative overflow-hidden border-y border-hairline bg-surface-raised/40">
      {/* live-signal blip travelling the baseline */}
      <div className="dispatch-scan pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-accent-good/10 to-transparent" />
      <div className="relative mx-auto max-w-5xl px-4">
        <dl className="flex items-center gap-x-6 gap-y-1 overflow-x-auto py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted whitespace-nowrap">
          <div className="flex items-center gap-2 text-accent-good shrink-0">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
            </span>
            <span>monitorinq aktiv</span>
          </div>
          <Stat k="mənbə" v="40+" />
          <Stat k="dispaç" v={String(total)} />
          <Stat k="kev" v={String(kev)} highlight={kev > 0} />
          {last && (
            <div className="flex items-center gap-2 shrink-0">
              <dt className="text-ink-muted/70">son dispaç</dt>
              <dd className="text-ink-secondary tabular-nums">
                {last.date} · {last.time}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

function Stat({ k, v, highlight = false }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <dt className="text-ink-muted/70">{k}</dt>
      <dd className={`tabular-nums ${highlight ? "text-accent-critical" : "text-ink-secondary"}`}>
        {v}
      </dd>
    </div>
  );
}
