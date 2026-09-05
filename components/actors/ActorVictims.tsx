import { Panel } from "@/components/site/Panel";
import type { ThreatActor } from "@/lib/threatactors";

function isoDay(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

// Whole months between two dates, floored at 1 so a crew observed inside a
// single month still yields a real (not divide-by-zero) monthly rate. Pure
// function of two given dates — no wall-clock read, safe to call from render.
function monthsBetween(first: Date, last: Date): number {
  const months = (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth());
  return Math.max(1, months);
}

// Ransomware-crew stats, straight off the leak-site listings — a count, two
// dates and a derived rate, nothing modeled. Renders only for a crime actor
// with an actual victim count; a nation-state or a name-only stub gets none
// of this, honestly.
export function ActorVictims({
  actor,
}: {
  actor: Pick<ThreatActor, "type" | "victim_count" | "first_seen" | "last_active">;
}) {
  const victims = actor.victim_count ?? 0;
  if (actor.type !== "crime" || victims <= 0) return null;

  const first = actor.first_seen ? new Date(actor.first_seen) : null;
  const last = actor.last_active ? new Date(actor.last_active) : null;
  const firstOk = !!first && !Number.isNaN(first.getTime());
  const lastOk = !!last && !Number.isNaN(last.getTime());
  const velocity = firstOk && lastOk ? victims / monthsBetween(first!, last!) : null;

  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Panel className="p-6 sm:p-8">
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Victims observed</dt>
            <dd className="mt-2 font-display text-[1.8rem] font-semibold text-ink-primary">
              {victims.toLocaleString("en-US")}
            </dd>
          </div>
          {firstOk && (
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">First observed</dt>
              <dd className="mt-2 font-mono text-[15px] text-ink-primary">
                <time dateTime={isoDay(actor.first_seen)!}>{isoDay(actor.first_seen)}</time>
              </dd>
            </div>
          )}
          {lastOk && (
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                Last observed on leak site
              </dt>
              <dd className="mt-2 font-mono text-[15px] text-ink-primary">
                <time dateTime={isoDay(actor.last_active)!}>{isoDay(actor.last_active)}</time>
              </dd>
            </div>
          )}
          {velocity != null && (
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Velocity</dt>
              <dd className="mt-2 font-mono text-[15px] text-ink-primary">≈ {velocity.toFixed(1)} victims / month</dd>
              <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">lifetime average, first to last observed</dd>
            </div>
          )}
        </dl>
      </Panel>
      <p className="mt-3 font-mono text-[11px] text-ink-muted">
        leak-site listings via ransomware.live — a quiet site is not a dead crew
      </p>
    </section>
  );
}
