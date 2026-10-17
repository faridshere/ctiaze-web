"use client";

import { normTactic, TACTIC_COUNT } from "@/lib/attack";

import { useMemo, useState } from "react";
import type { Ttp } from "@/lib/threatactors";
import type { TechniqueNote, TtpProfile } from "@/lib/actor-intel";

// The actor's ATT&CK techniques laid along the kill chain as a ruled ledger:
// one ruled row per tactic, in kill-chain order, the tactic's label and count
// in the left column and its techniques set inline in the right column —
// name in the body face, T-id in mono — wrapping like a line of type. It fits
// any width with no sideways scroll and no dead height under short tactics.
// Two interactions make it a tool rather than a poster: tap a technique for
// the plain-English note and how many roster actors share it; pick a target
// country or sector and the techniques in that profile's top set are lit
// (the deeper stock under a 2px ink rule), the rest step back — "which of
// their techniques matter for finance / for Azerbaijan?". At rest each
// technique sits on a soft rule; lit swaps it for ink, the open one for stamp.
const ORDER: { key: string; label: string }[] = [
  { key: "reconnaissance", label: "Reconnaissance" },
  { key: "resource-development", label: "Resource development" },
  { key: "initial-access", label: "Initial access" },
  { key: "execution", label: "Execution" },
  { key: "persistence", label: "Persistence" },
  { key: "privilege-escalation", label: "Privilege escalation" },
  { key: "stealth", label: "Stealth" },
  { key: "defense-impairment", label: "Defense impairment" },
  { key: "credential-access", label: "Credential access" },
  { key: "discovery", label: "Discovery" },
  { key: "lateral-movement", label: "Lateral movement" },
  { key: "collection", label: "Collection" },
  { key: "command-and-control", label: "Command and control" },
  { key: "exfiltration", label: "Exfiltration" },
  { key: "impact", label: "Impact" },
];
// The engine's newer tactic names fold into the classic fourteen (lib/attack).
const norm = normTactic;

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

  const rows = useMemo(() => {
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
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <p className="num font-mono text-[12px] uppercase tracking-[0.1em] text-ink-3">
          {techniques.length} techniques · {rows.length} of {TACTIC_COUNT} tactics
          {profile && (
            <span className="text-ink">
              {" "}· {litCount} in the top techniques against {profile.label}
            </span>
          )}
        </p>
        <label className="flex min-w-0 max-w-full items-baseline gap-3">
          <span className="label shrink-0 text-ink-3">Matters for</span>
          {/* A select is as wide as its longest option; capped so a phone never scrolls sideways. */}
          <span className="relative inline-block min-w-0 max-w-[16rem] flex-1">
            <select
              value={profileKey}
              onChange={(e) => setProfileKey(e.target.value)}
              className="num w-full appearance-none truncate border-0 border-b-2 border-ink bg-transparent py-1 pl-0 pr-6 font-mono text-[12px] uppercase tracking-[0.08em] text-ink focus:border-brand focus:outline-none"
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
            <span aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[11px] text-ink">
              ▾
            </span>
          </span>
        </label>
      </div>

      <ol className="mt-4 border-t border-ink" aria-label="ATT&CK techniques by tactic, in kill-chain order">
        {rows.map((c) => (
          <li key={c.key} className="row grid gap-x-6 gap-y-1.5 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <h3 className="label text-ink">{c.label}</h3>
              <span className="num font-mono text-[11px] text-ink-3 sm:mt-1 sm:block">
                {c.items.length} technique{c.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="-mx-1 flex min-w-0 flex-wrap gap-x-4 gap-y-1">
              {c.items.map((t) => {
                const isLit = lit.has(t.id.toUpperCase());
                const dim = profile && !isLit;
                const active = open === t.id;
                const state = active
                  ? "border-stamp bg-paper-deep"
                  : isLit
                    ? "border-ink bg-paper-deep"
                    : "border-rule-soft hover:bg-paper-deep";
                return (
                  <li key={t.id} className="min-w-0 max-w-full">
                    <button
                      type="button"
                      onClick={() => setOpen(active ? null : t.id)}
                      aria-pressed={active}
                      title={`${t.id} · ${t.name}`}
                      className={`flex max-w-full items-baseline gap-x-1.5 border-b-2 px-1 pb-px pt-0.5 text-left transition-[opacity,border-color,background-color] duration-300 ${state} ${dim ? "opacity-35" : ""}`}
                    >
                      <span className="min-w-0 truncate text-[13.5px] leading-snug text-ink">{t.name}</span>
                      <span className="num shrink-0 font-mono text-[10.5px] text-ink-3">{t.id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <div
        aria-live="polite"
        className={`ink-box mt-4 bg-paper-deep px-4 py-3 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      >
        {openTtp ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="num font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
                {openTtp.id} · {current?.tactic || norm(openTtp.tactic)}
                {current && current.usedBy > 0 && <span> · used by {current.usedBy} roster actors</span>}
              </p>
              <p className="headline mt-1 text-[17px] text-ink">{openTtp.name}</p>
              {current?.en && <p className="mt-1 max-w-[64ch] text-[14px] leading-relaxed text-ink-2">{current.en}</p>}
            </div>
            <a href={techUrl(openTtp.id)} target="_blank" rel="noopener noreferrer" className="label ulink shrink-0 text-ink-3 hover:text-ink">
              ATT&amp;CK ↗
            </a>
          </div>
        ) : (
          <p className="label text-ink-3">select a technique</p>
        )}
      </div>
    </div>
  );
}
