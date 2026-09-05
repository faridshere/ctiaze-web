import Link from "next/link";
import { ActorSigil } from "@/components/actors/ActorSigil";
import type { ActorRow } from "@/lib/threatactors";

const TYPE_INK: Record<string, string> = {
  "nation-state": "text-accent-critical",
  crime: "text-accent-warning",
};

// One adversary as a ledger line — the wire's own row language (hairline,
// grid, mono meta on the right) rather than a card. `a.type === "unknown"`
// renders nothing rather than the word "unknown": an empty field says nothing.
export function ActorLedgerRow({ a, i = 0 }: { a: ActorRow; i?: number }) {
  const typeLabel = a.type !== "unknown" ? a.type : null;
  const metaTail = a.techniqueCount > 0 ? `${a.techniqueCount} TTPs` : a.victims > 0 ? `${a.victims} victims` : null;
  return (
    <Link
      href={`/actors/${a.id}`}
      data-sc
      style={{ transitionDelay: `${Math.min(i * 40, 320)}ms` }}
      className="group grid grid-cols-[auto_1fr] items-center gap-x-4 border-b border-hairline py-[13px] transition-colors hover:bg-surface-hover sm:grid-cols-[auto_1fr_auto]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-hairline bg-surface text-ink-secondary">
        <ActorSigil a={{ _id: a.id, type: a.type, techniques: Array.from({ length: Math.min(a.techniqueCount, 9) }) }} size={34} />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="font-display text-[1.02rem] font-semibold tracking-[-0.01em] text-ink-primary transition-colors group-hover:text-brand">
            {a.name}
          </span>
          {a.aliases.slice(0, 2).map((al) => (
            <span key={al} className="font-mono text-[10.5px] text-ink-muted">
              {al}
            </span>
          ))}
        </span>
        {a.summary && <span className="mt-0.5 block truncate text-[13px] leading-snug text-ink-secondary">{a.summary}</span>}
      </span>
      <span className="hidden shrink-0 flex-col items-end gap-y-0.5 text-right font-mono text-[11px] leading-snug text-ink-muted sm:flex">
        {typeLabel && <span className={`uppercase tracking-[0.08em] ${TYPE_INK[typeLabel] ?? ""}`}>{typeLabel}</span>}
        {a.originLabel && <span className="max-w-[34ch] truncate">assessed origin: {a.originLabel}</span>}
        {(metaTail || a.mitre) && (
          <span>
            {metaTail}
            {metaTail && a.mitre ? " · " : null}
            {a.mitre}
          </span>
        )}
      </span>
    </Link>
  );
}
