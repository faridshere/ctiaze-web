import {
  ACTOR_TYPE_LABEL,
  actorInitials,
  flagEmoji,
  originLabel,
  type ThreatActor,
} from "@/lib/threatactors";

const TYPE_CHIP: Record<string, string> = {
  "nation-state": "border-accent-critical/40 bg-accent-critical/10 text-accent-critical",
  crime: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  unknown: "border-hairline bg-surface text-ink-muted",
};

function fmtDay(d?: string | Date): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const mon = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${mon[dt.getUTCMonth()]}`;
}

export function ActorDossier({ a }: { a: ThreatActor }) {
  const origin = originLabel(a);
  const flag = flagEmoji(a.origin_country);
  const aliases = (a.aliases || []).filter((x) => x !== a.name).slice(0, 3);
  const countries = (a.targets_countries || []).slice(0, 4);
  const sectors = (a.targets_sectors || []).slice(0, 4);
  const recent = (a.recent_activity || []).slice(0, 3);
  const primaryRef = (a.refs || [])[0] || null;

  return (
    <article className="flex flex-col rounded-md border border-hairline bg-surface-raised/40">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-hairline bg-surface font-mono text-sm font-semibold text-ink-secondary">
          {actorInitials(a.name)}
        </span>
        <div className="min-w-0">
          <div className="font-headline text-lg font-semibold leading-tight text-ink-primary">{a.name}</div>
          {aliases.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {aliases.map((al) => (
                <span key={al} className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">
                  {al}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_CHIP[a.type] ?? TYPE_CHIP.unknown}`}>
          {ACTOR_TYPE_LABEL[a.type] ?? a.type}
        </span>
      </div>

      <div className="grid gap-3 px-4 pb-3">
        {a.description_az && (
          <p className="text-[13px] leading-relaxed text-ink-secondary">{a.description_az}</p>
        )}
        {origin && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">mənşə (suspected)</div>
            <div className="mt-1 flex items-center gap-2 text-[13.5px] text-ink-primary">
              {flag && <span aria-hidden="true">{flag}</span>}
              <span>{origin}</span>
              {a.state_sponsor && a.type === "nation-state" && (
                <span className="text-ink-muted">· dövlət sponsoru</span>
              )}
            </div>
          </div>
        )}
        {countries.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              hədəf ölkələr (mənbənin bildirdiyi)
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {countries.map((c) => (
                <span key={c} className="rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-primary">{c}</span>
              ))}
            </div>
          </div>
        )}
        {sectors.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">hədəf sektorlar</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {sectors.map((s) => (
                <span key={s} className="rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-primary">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="border-t border-hairline px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">son fəaliyyət · bizim intel</div>
          <div className="mt-2 space-y-2">
            {recent.map((r, i) => (
              <a
                key={`${r.url}-${i}`}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2.5 border-t border-dashed border-hairline pt-2 first:border-t-0 first:pt-0 hover:opacity-90"
              >
                <span className="mt-1.5 size-1.5 self-start rounded-full bg-brand" aria-hidden="true" />
                <span className="text-[12.5px] leading-snug text-ink-secondary">{r.title}</span>
                <span className="whitespace-nowrap font-mono text-[10.5px] text-ink-muted">{fmtDay(r.date)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-hairline px-4 py-2.5 font-mono text-[11px] text-ink-muted">
        <span>source: <span className="text-ink-secondary">{a.source}</span></span>
        <span className="flex-1" />
        {primaryRef && (a.refs?.length ?? 0) > 0 && (
          <a href={primaryRef} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            {a.refs.length} ref →
          </a>
        )}
      </div>
    </article>
  );
}
