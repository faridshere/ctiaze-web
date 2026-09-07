"use client";

import { useState, useSyncExternalStore } from "react";
import { getPowToken, primePowToken } from "@/lib/pow-client";
import { PowBadge } from "@/components/PowBadge";
import { Button } from "@/components/site/Button";

// The email form. Headings belong to the caller (hero, CtaBand); this is the
// input, the button, the shield badge and the two end states. Captcha-gated by
// the same invisible proof-of-work as the API. That raises the cost of casual
// scripting; it does not make the list unscriptable (see lib/pow.ts).
// `source` tags where the signup came from (read back in /admin).
type State = "idle" | "loading" | "error";

// "done" means converted; "seen" means shown. Both suppress any modal; only
// "done" means we have them.
const DONE_KEY = "skopnix.waitlist.done";
const SEEN_KEY = "skopnix.waitlist.seen";

// ---------------------------------------------------------------------------
// The confirmation has to survive a refresh: without this, someone who already
// signed up comes back to an empty form and can't tell whether it worked.
//
// Read through useSyncExternalStore rather than an effect, for two reasons:
// these pages are statically rendered, so the server snapshot (`false`) keeps
// first paint identical to the server's markup and hydration stays clean; and
// subscribing to `storage` syncs the state across the visitor's other tabs.
//
// This is a per-browser courtesy, not authoritative state — the database is.
// A new device or cleared storage just shows the form again, and re-submitting
// is a harmless upsert (the API dedupes on email).
// ---------------------------------------------------------------------------
const listeners = new Set<() => void>();

function subscribeDone(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

// `storage` only fires in *other* tabs, so same-tab writes notify by hand.
function emitDone() {
  for (const l of listeners) l();
}

function readDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false; // private mode — just show the form
  }
}

export function Waitlist({ source = "site" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");

  // getSnapshot returns a primitive, so React can compare it by value.
  const done = useSyncExternalStore(subscribeDone, readDone, () => false);

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
        setState("idle");
        try {
          localStorage.setItem(DONE_KEY, "1");
          localStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* private mode */
        }
        emitDone();
      } else {
        setState("error");
        setMsg(j.error || "Something went wrong — try again.");
      }
    } catch {
      setState("error");
      setMsg("Network error — try again.");
    }
  }

  // Escape hatch: someone who mistyped their address must not be locked out of
  // the form forever by their own browser.
  function reset() {
    try {
      localStorage.removeItem(DONE_KEY);
    } catch {
      /* ignore */
    }
    emitDone();
    setEmail("");
    setMsg("");
    setState("idle");
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-panel)] border border-accent-good/30 bg-accent-good/[0.06] px-5 py-4"
      >
        <p className="font-display text-lg font-semibold text-ink-primary">You&apos;re on the list.</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-secondary">
          One email when your free access is ready. Nothing else, ever — no tracking pixels, no reselling.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted underline-offset-4 hover:text-ink-secondary hover:underline"
        >
          Use a different email
        </button>
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
