"use client";

import { useSyncExternalStore } from "react";
import { getPowStatus, subscribePowStatus, type PowStatus } from "@/lib/pow-client";

// A small, honest indicator that the tool is shielded by the invisible
// proof-of-work gate. No puzzle, no friction — it just makes the protection
// visible: "verifying…" while a token is being solved, "bot-protected" once
// one is armed. Reflects the real client state (usePowStatus).
export function usePowStatus(): PowStatus {
  return useSyncExternalStore(subscribePowStatus, getPowStatus, () => "idle");
}

// "idle" is the resting state now that the token is only solved on first focus
// of the form (lazy priming) — it can last the whole visit, so it must read as
// settled, not in-progress. The endpoint itself rejects tokenless submissions
// regardless of client state, so "bot-protected" is true the entire time; the
// armed state simply marks when this browser's token is solved and verified.
//
// v4: three states in the paper's inks. The shield is drawn in ink; the armed
// state fills it in --better and adds the tick; solving/re-verifying is the
// shield outlined in ink-3 with the label pulsing. No dot, no colour-only cue:
// the label text changes with the state.
const MAP: Record<PowStatus, { label: string; tone: string; pulse: boolean; on: boolean }> = {
  idle: { label: "bot-protected", tone: "text-ink-3", pulse: false, on: false },
  solving: { label: "verifying…", tone: "text-ink-3", pulse: true, on: false },
  ready: { label: "bot-protected", tone: "text-better", pulse: false, on: true },
  error: { label: "re-verifying…", tone: "text-ink-3", pulse: true, on: false },
};

export function PowBadge({ className = "" }: { className?: string }) {
  const s = usePowStatus();
  const m = MAP[s];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 ${className}`}
      title="Protected against automated abuse. There's no puzzle — verification runs invisibly in your browser."
      data-pow={s}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={`size-3 ${m.on ? "text-better" : "text-ink"} ${m.pulse ? "animate-pulse" : ""}`}
        fill={m.on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3 4 6v5c0 4.5 3.2 7.5 8 9 4.8-1.5 8-4.5 8-9V6l-8-3Z" />
        {m.on && <path d="M9 12l2 2 4-4" stroke="var(--paper)" />}
      </svg>
      <span className={`${m.tone} ${m.pulse ? "animate-pulse" : ""}`}>{m.label}</span>
    </span>
  );
}
