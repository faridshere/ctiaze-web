import type { ThreatActor } from "@/lib/_disabled/threatactors-legacy";

// T1566.001 → attack.mitre.org/techniques/T1566/001
function techUrl(id: string): string {
  const [base, sub] = id.split(".");
  return `https://attack.mitre.org/techniques/${base}${sub ? `/${sub}` : ""}`;
}

/**
 * Kill-chain playbook — the DO-built per-stage detection guidance, rendered as
 * a numbered ledger. Every stage cites the real ATT&CK techniques it covers;
 * guidance text is the engine's grounded output (az/en), never invented here.
 */
export function ActorPlaybook({ a, en }: { a: ThreatActor; en: boolean }) {
  const stages = (a.playbook?.stages ?? []).filter(
    (s) => (s?.az || s?.en) && s?.tactic,
  );
  if (!stages.length) return null;

  return (
    <section data-sc className="mt-10">
      <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
        {en ? "Kill-chain playbook" : "Hücum zənciri — müdafiə kitabçası"}
        <span aria-hidden className="h-px flex-1 bg-hairline" />
        <span className="font-normal text-ink-muted">{stages.length}</span>
      </h2>
      <ol className="mt-4 space-y-3">
        {stages.map((s, i) => (
          <li
            key={`${s.tactic}-${i}`}
            className="border border-hairline border-l-2 border-l-brand/60 bg-surface-raised p-4"
            style={{ borderRadius: "var(--radius-chip)" }}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[11px] font-bold text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-ink-primary">
                {s.tactic}
              </h3>
              {(s.techniques ?? []).slice(0, 5).map((t) => (
                <a
                  key={t}
                  href={techUrl(t)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-secondary transition-colors hover:border-brand hover:text-brand"
                >
                  {t}
                </a>
              ))}
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
              {en ? s.en || s.az : s.az || s.en}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
