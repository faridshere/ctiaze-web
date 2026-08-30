import Link from "next/link";
import { ActorSigil, actorIsLive } from "@/components/ActorSigil";
import { originLabel, type ThreatActor } from "@/lib/threatactors";
import type { Locale } from "@/lib/i18n";

const RENDER_EPOCH = Date.now();

const TYPE_INK: Record<string, string> = {
  "nation-state": "text-accent-critical",
  crime: "text-accent-warning",
};

function fmtRel(d: string | Date | null | undefined, en: boolean): string | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.max(0, Math.round((RENDER_EPOCH - t) / 86_400_000));
  if (days < 1) return en ? "today" : "bu gün";
  if (days < 30) return `${days}${en ? "d" : "g"}`;
  return `${Math.round(days / 30)}${en ? "mo" : "ay"}`;
}

// One adversary as a ledger line — the wire's language (hairline rows, mono
// data on the right) instead of a chip-stuffed card. Full dossier one click in.
export function ActorRow({ a, locale, i }: { a: ThreatActor; locale: Locale; i: number }) {
  const en = locale === "en";
  const live = actorIsLive(a, RENDER_EPOCH);
  const desc = (en ? a.description_en || a.description_az : a.description_az || a.description_en) || "";
  const origin = originLabel(a, locale);
  const aliases = (a.aliases || []).filter((x) => x !== a.name).slice(0, 2);
  const rel = fmtRel(a.last_active, en);
  const victims = a.victim_count ?? 0;
  return (
    <Link
      href={`/actors/${a._id}`}
      data-sc
      style={{ transitionDelay: `${Math.min(i * 40, 320)}ms` }}
      className="group grid grid-cols-[auto_1fr] items-center gap-x-4 border-b border-hairline py-[13px] sm:grid-cols-[auto_1fr_auto]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-hairline bg-surface text-ink-secondary">
        <ActorSigil a={a} size={34} />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          {live && <span className="signal-dot inline-block size-1.5 self-center rounded-full bg-brand" title={en ? "active in the last 90 days" : "son 90 gündə aktiv"} />}
          <span className="font-display text-[1.02rem] font-semibold tracking-[-0.01em] text-ink-primary transition-colors group-hover:text-brand">{a.name}</span>
          {aliases.map((al) => (
            <span key={al} className="font-mono text-[10.5px] text-ink-muted">{al}</span>
          ))}
        </span>
        {desc && <span className="mt-0.5 block max-w-[52ch] truncate text-[13px] leading-snug text-ink-secondary">{desc}</span>}
      </span>
      <span className="hidden shrink-0 flex-col items-end gap-y-0.5 text-right font-mono text-[11px] leading-snug text-ink-muted sm:flex">
        {a.type !== "unknown" && <span className={`uppercase tracking-[0.08em] ${TYPE_INK[a.type] ?? ""}`}>{a.type}</span>}
        {origin && <span className="max-w-[22ch] truncate">{origin}</span>}
        <span>
          {victims > 0 ? `${victims} ${en ? "victims" : "qurban"}` : null}
          {victims > 0 && rel ? " · " : null}
          {rel ? `${en ? "active" : "aktiv"} ${rel}` : null}
          {a.mitre ? `${victims > 0 || rel ? " · " : ""}${a.mitre}` : null}
        </span>
      </span>
    </Link>
  );
}
