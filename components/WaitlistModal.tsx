"use client";

import { useEffect, useState } from "react";
import { Waitlist } from "@/components/Waitlist";

const SEEN_KEY = "skopnix.waitlist.seen";

// A one-time, dismissible early-access prompt shown a few seconds after landing
// on a tool page. Shows ONCE per visitor (localStorage), never again once seen or
// signed up — deliberately non-naggy, in keeping with the nonchalant tone.
export function WaitlistModal({ source }: { source: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(SEEN_KEY) === "1"; } catch { seen = false; }
    if (seen) return;
    const t = setTimeout(() => {
      setOpen(true);
      try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ }
    }, 9000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Early access"
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-sm text-ink-muted transition-colors hover:text-ink-primary"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">Early access</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-ink-primary">
          Like what you see?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
          Drop your email for <b className="font-medium text-ink-primary">free early access</b> — more tools,
          deeper data, and your own login when it opens. No spam, just the invite.
        </p>
        <div className="mt-5">
          <Waitlist source={source} compact />
        </div>
      </div>
    </div>
  );
}
