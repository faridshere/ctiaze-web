import Link from "next/link";
import { ActorSigil, actorIsLive } from "@/components/ActorSigil";

// Module-load epoch keeps the 90-day liveness check out of render (purity rule);
// a lambda lives minutes, the window is months — staleness is irrelevant.
const RENDER_EPOCH = Date.now();
import {
  actorInitials,
  flagEmoji,
  originLabel,
  type NamedRef,
  type ThreatActor,
  type Ttp,
} from "@/lib/threatactors";
import { getDict, type Locale } from "@/lib/i18n";

const TYPE_CHIP: Record<string, string> = {
  "nation-state": "border-accent-critical/40 bg-accent-critical/10 text-accent-critical",
  crime: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  unknown: "border-hairline bg-surface text-ink-muted",
};

function fmtDay(d: string | Date | undefined | null, locale: Locale): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const mon = locale === "en"
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${mon[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

// T1566.001 → attack.mitre.org/techniques/T1566/001 ; S0002 → /software/S0002
function techUrl(id: string): string {
  const [base, sub] = id.split(".");
  return `https://attack.mitre.org/techniques/${base}${sub ? `/${sub}` : ""}`;
}
function softUrl(id: string | null): string | null {
  return id ? `https://attack.mitre.org/software/${id}` : null;
}

function LabelledChips({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const CHIP = "rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-primary";

function TechChips({ items, label, more }: { items: Ttp[]; label: string; more: (n: number) => string }) {
  const shown = items.slice(0, 8);
  const rest = items.length - shown.length;
  return (
    <LabelledChips label={label}>
      {shown.map((t) => (
        <a
          key={t.id}
          href={techUrl(t.id)}
          target="_blank"
          rel="noopener noreferrer"
          title={`${t.id} · ${t.name}`}
          className={`${CHIP} transition-colors hover:border-brand hover:text-brand`}
        >
          {t.name}
        </a>
      ))}
      {rest > 0 && <span className="px-1 py-0.5 font-mono text-[11px] text-ink-muted">{more(rest)}</span>}
    </LabelledChips>
  );
}

function SoftChips({ items, label, more }: { items: NamedRef[]; label: string; more: (n: number) => string }) {
  const shown = items.slice(0, 6);
  const rest = items.length - shown.length;
  return (
    <LabelledChips label={label}>
      {shown.map((s) => {
        const url = softUrl(s.id);
        return url ? (
          <a key={s.name} href={url} target="_blank" rel="noopener noreferrer" title={s.id ?? undefined}
            className={`${CHIP} transition-colors hover:border-brand hover:text-brand`}>
            {s.name}
          </a>
        ) : (
          <span key={s.name} className={CHIP}>{s.name}</span>
        );
      })}
      {rest > 0 && <span className="px-1 py-0.5 font-mono text-[11px] text-ink-muted">{more(rest)}</span>}
    </LabelledChips>
  );
}

export function ActorDossier({ a, locale, standalone }: { a: ThreatActor; locale: Locale; standalone?: boolean }) {
  const t = getDict(locale).actors;
  const origin = originLabel(a, locale);
  const flag = flagEmoji(a.origin_country);
  const aliases = (a.aliases || []).filter((x) => x !== a.name).slice(0, 3);
  const countries = (a.targets_countries || []).slice(0, 4);
  const sectors = (a.targets_sectors || []).slice(0, 4);
  const recent = (a.recent_activity || []).slice(0, 3);
  const primaryRef = (a.refs || [])[0] || null;
  const desc = locale === "en" ? a.description_en || a.description_az : a.description_az || a.description_en;
  const typeLabel = a.type === "unknown" ? t.nameleum : a.type;
  const isCrime = a.type === "crime";
  const techniques = a.techniques || [];
  const software = [...(a.malware || []), ...(a.tools || [])];
  const conf = a.attribution_confidence;
  const sources = a.sources && a.sources.length ? a.sources : a.source ? [a.source] : [];

  return (
    <article className="flex flex-col rounded-md border border-hairline bg-surface-raised/40">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 p-4 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-hairline bg-surface text-ink-secondary" title={actorInitials(a.name)}>
          <ActorSigil a={a} size={34} />
        </span>
        <div className="min-w-0">
          <h3 className="font-headline text-lg font-semibold leading-tight text-ink-primary">
            {standalone ? a.name : (
              <Link href={`/actors/${a._id}`} className="transition-colors hover:text-brand">{a.name}</Link>
            )}
          </h3>
          {aliases.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {aliases.map((al) => (
                <span key={al} className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">{al}</span>
              ))}
            </div>
          )}
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {actorIsLive(a, RENDER_EPOCH) && (
            <span className="flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand">
              <span className="signal-dot size-1.5 rounded-full bg-brand" />
              {locale === "en" ? "active" : "aktiv"}
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_CHIP[a.type] ?? TYPE_CHIP.unknown}`}>
            {typeLabel}
          </span>
        </span>
      </div>

      <div className="grid gap-3 px-4 pb-3">
        {desc && <p className="text-[13px] leading-relaxed text-ink-secondary line-clamp-4">{desc}</p>}
        {origin && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{t.originLabel}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-primary">
              {flag && <span aria-hidden="true">{flag}</span>}
              <span>{origin}</span>
              {a.state_sponsor && a.type === "nation-state" && <span className="text-ink-muted">· {t.sponsorSuffix}</span>}
              {typeof conf === "number" && (
                <span className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                  {t.confidenceLabel}: {t.confidenceBand(conf)} ({conf})
                </span>
              )}
            </div>
          </div>
        )}
        {countries.length > 0 && (
          <LabelledChips label={isCrime ? t.observedCountries : t.targetCountries}>
            {countries.map((cc) => (
              <span key={cc} className="rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-primary">{cc}</span>
            ))}
          </LabelledChips>
        )}
        {sectors.length > 0 && (
          <LabelledChips label={isCrime ? t.observedSectors : t.targetSectors}>
            {sectors.map((s) => (
              <span key={s} className="rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-primary">{s}</span>
            ))}
          </LabelledChips>
        )}
        {isCrime && (a.victim_count ?? 0) > 0 && (
          <div className="font-mono text-[11px] text-ink-muted">
            {t.victimsLabel(a.victim_count as number)}
            {a.last_active && <span> · {t.lastActiveLabel} {fmtDay(a.last_active, locale)}</span>}
          </div>
        )}
        {techniques.length > 0 && <TechChips items={techniques} label={t.techniquesLabel} more={t.moreWord} />}
        {software.length > 0 && (
          <SoftChips items={software} label={(a.malware?.length ? t.malwareLabel : t.toolsLabel)} more={t.moreWord} />
        )}
        {(a.related_actors?.length ?? 0) > 0 && (
          <LabelledChips label={t.relatedLabel}>
            {a.related_actors!.map((rel) => (
              <span key={rel._id} className="rounded-sm border border-hairline bg-surface px-2 py-0.5 text-[12px] text-ink-secondary">{rel.name}</span>
            ))}
          </LabelledChips>
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
        <span>{t.sourceLabel}: <span className="text-ink-secondary">{sources.join(" + ")}</span></span>
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
