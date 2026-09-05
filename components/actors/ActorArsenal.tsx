import { Kicker } from "@/components/site/Kicker";
import type { NamedRef } from "@/lib/threatactors";
import type { SoftwareUsage } from "@/lib/actor-intel";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border border-hairline px-2 py-1 font-mono text-[11px] transition-colors";

function softwareUrl(id: string | null): string | null {
  return id ? `https://attack.mitre.org/software/${id}` : null;
}

function SoftwareChip({ item, usage }: { item: NamedRef; usage: SoftwareUsage }) {
  const n = item.id ? usage[item.id] ?? 0 : 0;
  const url = softwareUrl(item.id);
  const inner = (
    <>
      <span className="text-ink-primary">{item.name}</span>
      {item.id && <span className="text-ink-muted">{item.id}</span>}
      {n > 1 && <span className="text-ink-muted">· {n} actors</span>}
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${CHIP} hover:border-ink-muted`}>
      {inner}
    </a>
  ) : (
    <span className={CHIP}>{inner}</span>
  );
}

function Group({ label, items, usage }: { label: string; items: NamedRef[]; usage: SoftwareUsage }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <SoftwareChip key={`${it.id ?? it.name}`} item={it} usage={usage} />
        ))}
      </div>
    </div>
  );
}

// What this actor is documented using — malware families and off-the-shelf
// tools, each linked to ATT&CK's software entry when we have its S-id, with
// the roster-wide reuse count (from the engine's graph) surfaced only when it
// says something ("shared by 14 actors" is a fact; "shared by 1" is not).
export function ActorArsenal({
  malware,
  tools,
  usage,
}: {
  malware: NamedRef[];
  tools: NamedRef[];
  usage: SoftwareUsage;
}) {
  if (malware.length === 0 && tools.length === 0) return null;
  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Kicker>Arsenal</Kicker>
      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:gap-10">
        <Group label="Malware" items={malware} usage={usage} />
        <Group label="Tools" items={tools} usage={usage} />
      </div>
    </section>
  );
}
