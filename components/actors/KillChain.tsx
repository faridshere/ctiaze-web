"use client";

import { useMemo, useState } from "react";
import type { Ttp } from "@/lib/threatactors";
import type { TechniqueNote, TtpProfile } from "@/lib/actor-intel";

// The actor's ATT&CK techniques laid along the kill chain — fourteen tactics in
// order, one column each, a chip per technique. Two interactions make it a tool
// rather than a poster: hover/tap a chip for the plain-English note and how
// many roster actors share it; pick a target country or sector and the chips
// that sit in that profile's top techniques light up, the rest step back —
// "which of their techniques matter for finance / for Azerbaijan?".
const ORDER: { key: string; label: string }[] = [
  { key: "reconnaissance", label: "Recon" },
  { key: "resource-development", label: "Resources" },
  { key: "initial-access", label: "Initial access" },
  { key: "execution", label: "Execution" },
  { key: "persistence", label: "Persistence" },
  { key: "privilege-escalation", label: "Priv. esc." },
  { key: "defense-evasion", label: "Evasion" },
  { key: "credential-access", label: "Credentials" },
  { key: "discovery", label: "Discovery" },
  { key: "lateral-movement", label: "Lateral" },
  { key: "collection", label: "Collection" },
  { key: "command-and-control", label: "C2" },
  { key: "exfiltration", label: "Exfil" },
  { key: "impact", label: "Impact" },
];
// The engine's newer tactic names fold into the classic fourteen.
const FOLD: Record<string, string> = { stealth: "defense-evasion", "defense-impairment": "defense-evasion" };
const norm = (s: string | null | undefined) => {
  const k = (s ?? "").toLowerCase().replace(/[_\s]+/g, "-").trim();
  return FOLD[k] ?? k;
};

function techUrl(id: string): string {
  const [base, sub] = id.split(".");
  return `https://attack.mitre.org/techniques/${base}${sub ? `/${sub}` : ""}`;
}

export function KillChain({
  techniques,
  notes,
  profiles,
}: {
  techniques: Ttp[];
  notes: Record<string, TechniqueNote>;
  profiles: TtpProfile[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [profileKey, setProfileKey] = useState<string>("");

  const columns = useMemo(() => {
    const by = new Map<string, Ttp[]>();
    for (const t of techniques) {
      const k = norm(t.tactic);
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(t);
    }
    return ORDER.map((o) => ({ ...o, items: by.get(o.key) ?? [] })).filter((c) => c.items.length > 0);
  }, [techniques]);

  const profile = profiles.find((p) => p.key === profileKey) ?? null;
  const lit = useMemo(() => new Set(profile?.ids ?? []), [profile]);
  const litCount = profile ? techniques.filter((t) => lit.has(t.id.toUpperCase())).length : 0;
  const current = open ? notes[open.toUpperCase()] : null;
  const openTtp = open ? techniques.find((t) => t.id === open) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          {techniques.length} techniques · {columns.length} of 14 tactics
          {profile && (
            <span className="text-ink-secondary">
              {" "}· {litCount} in the top techniques against {profile.label}
            </span>
          )}
        </p>
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <span>Matters for</span>
          <select
            value={profileKey}
            onChange={(e) => setProfileKey(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-hairline bg-surface px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-primary focus:border-brand focus:outline-none"
          >
            <option value="">— everyone —</option>
            <optgroup label="Sectors">
              {profiles.filter((p) => p.kind === "sector").map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="Countries">
              {profiles.filter((p) => p.kind === "country").map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <ol className="flex min-w-max gap-2">
          {columns.map((c, ci) => (
            <li key={c.key} data-sc className="w-[9.5rem] shrink-0" style={{ transitionDelay: `${Math.min(ci * 40, 320)}ms` }}>
              <div className="flex items-baseline justify-between border-b border-hairline pb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-secondary">{c.label}</span>
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">{c.items.length}</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {c.items.map((t) => {
                  const isLit = lit.has(t.id.toUpperCase());
                  const dim = profile && !isLit;
                  const active = open === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(active ? null : t.id)}
                        aria-pressed={active}
                        title={`${t.id} · ${t.name}`}
                        className={`w-full rounded-[var(--radius-btn)] border px-2 py-1.5 text-left transition-[opacity,border-color,background-color] duration-300 ${
                          active
                            ? "border-brand bg-brand-wash"
                            : isLit
                              ? "border-limb/60 bg-limb/[0.07]"
                              : "border-hairline bg-surface-raised hover:border-ink-muted/60"
                        } ${dim ? "opacity-35" : ""}`}
                      >
                        <span className="block truncate text-[12px] leading-snug text-ink-primary">{t.name}</span>
                        <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-ink-muted">{t.id}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      <div
        aria-live="polite"
        className={`mt-3 rounded-[var(--radius-panel)] border border-hairline bg-surface-raised px-4 py-3 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      >
        {openTtp ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                {openTtp.id} · {current?.tactic || norm(openTtp.tactic)}
                {current && current.usedBy > 0 && <span> · used by {current.usedBy} roster actors</span>}
              </p>
              <p className="mt-1 font-display text-[15px] font-semibold text-ink-primary">{openTtp.name}</p>
              {current?.en && <p className="mt-1 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-secondary">{current.en}</p>}
            </div>
            <a
              href={techUrl(openTtp.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-ink-primary"
            >
              ATT&amp;CK ↗
            </a>
          </div>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">select a technique</p>
        )}
      </div>
    </div>
  );
}
