"use client";

import { useState } from "react";
import { getPowToken, primePowToken } from "@/lib/pow-client";
import { PowBadge } from "@/components/PowBadge";
import { Button } from "@/components/site/Button";

// The email form. Headings belong to the caller (hero, CtaBand); this is the
// input, the button, the shield badge and the two end states. Captcha-gated by
// the same invisible proof-of-work as the API, so the list can't be scripted.
// `source` tags where the signup came from (read back in /admin).
type State = "idle" | "loading" | "done" | "error";

export function Waitlist({ source = "site" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setState("loading");
    setMsg("");
    try {
      const pow = await getPowToken();
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json", "x-pow": pow },
        body: JSON.stringify({ email: v, source }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.ok) {
        setState("done");
        // "done" means converted; "seen" means shown. Both suppress any modal;
        // only "done" means we have them.
        try {
          localStorage.setItem("skopnix.waitlist.done", "1");
          localStorage.setItem("skopnix.waitlist.seen", "1");
        } catch {
          /* private mode */
        }
      } else {
        setState("error");
        setMsg(j.error || "Something went wrong — try again.");
      }
    } catch {
      setState("error");
      setMsg("Network error — try again.");
    }
  }

  if (state === "done") {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-panel)] border border-accent-good/30 bg-accent-good/[0.06] px-5 py-4"
      >
        <p className="font-display text-lg font-semibold text-ink-primary">You&apos;re on the list.</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-secondary">
          One email when your free access is ready. Nothing else, ever — no tracking pixels, no reselling.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex flex-1 items-center">
          <span className="sr-only">Your email address</span>
          <input
            type="email"
            required
            aria-label="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // Solve the proof-of-work on first focus, not on mount: almost nobody
            // who loads the landing page types an email, and priming everyone
            // spent a serverless invocation per visitor for nothing.
            onFocus={() => primePowToken()}
            placeholder="you@company.com"
            autoComplete="email"
            spellCheck={false}
            className="h-12 w-full rounded-[var(--radius-btn)] border border-hairline bg-surface px-4 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
        <Button type="submit" disabled={state === "loading"} glyph="→" className="shrink-0">
          {state === "loading" ? "Sending" : "Get early access"}
        </Button>
      </form>
      <div className="mt-2.5 flex items-center gap-3">
        <PowBadge />
        {state === "error" && (
          <span role="alert" className="font-mono text-[11px] text-accent-critical">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
