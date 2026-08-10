import {
  actorInitials,
  flagEmoji,
  originLabel,
  type ThreatActor,
} from "@/lib/threatactors";
import { getDict, type Locale } from "@/lib/i18n";

const TYPE_CHIP: Record<string, string> = {
  "nation-state": "border-accent-critical/40 bg-accent-critical/10 text-accent-critical",
  crime: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  unknown: "border-hairline bg-surface text-ink-muted",
};

function fmtDay(d: string | Date | undefined, locale: Locale): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const mon = locale === "en"
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${mon[dt.getUTCMonth()]}`;
}

export function ActorDossier({ a, locale }: { a: ThreatActor; locale: Locale }) {
  const t = getDict(locale).actors;
  const origin = originLabel(a);
  const flag = flagEmoji(a.origin_country);
  const aliases = (a.aliases || []).filter((x) => x !== a.name).slice(0, 3);
  const countries = (a.targets_countries || []).slice(0, 4);
  const sectors = (a.targets_sectors || []).slice(0, 4);
  const recent = (a.recent_activity || []).slice(0, 3);
  const primaryRef = (a.refs || [])[0] || null;
  const desc = locale === "en" ? a.description_en || a.description_az : a.description_az || a.description_en;
  const typeLabel = a.type === "unknown" ? t.nameleum : a.type;

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
                <span key={al} className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">{al}</span>
              ))}
            </div>
          )}
        </div>
        <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_CHIP[a.type] ?? TYPE_CHIP.unknown}`}>
          {typeLabel}
        </span>
      </div>

      <div className="grid gap-3 px-4 pb-3">
        {desc && <p className="text-[13px] leading-relaxed text-ink-secondary line-clamp-4">{desc}</p>}
        {origin && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{t.originLabel}</div>
            <div className="mt-1 flex items-center gap-2 text-[13.5px] text-ink-primary">
              {flag && <span aria-hidden="true">{flag}</span>}
              <span>{origin}</span>
              {a.state_sponsor && a.type === "nation-state" && <span className="text-ink-muted">· {t.sponsorSuffix}</span>}
            </div>
          </div>
        )}
        {countries.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{t.targetCountries}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {countries.map((cc) => (
                <span key={cc} className="rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-primary">{cc}</span>
              ))}
            </div>
          </div>
        )}
        {sectors.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{t.targetSectors}</div>
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
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{t.recentLabel}</div>
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
                <span className="whitespace-nowrap font-mono text-[10.5px] text-ink-muted">{fmtDay(r.date, locale)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-hairline px-4 py-2.5 font-mono text-[11px] text-ink-muted">
        <span>{t.sourceLabel}: <span className="text-ink-secondary">{a.source}</span></span>
        <span className="flex-1" />
        {a.mitre && (
          <a href={`https://attack.mitre.org/groups/${a.mitre}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            {a.mitre}
          </a>
        )}
        {primaryRef && (a.refs?.length ?? 0) > 0 && (
          <a href={primaryRef} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            {t.refWord(a.refs.length)}
          </a>
        )}
      </div>
    </article>
  );
}
