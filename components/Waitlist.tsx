"use client";

import { useState, useSyncExternalStore } from "react";
import { getPowToken, primePowToken } from "@/lib/pow-client";
import { PowBadge } from "@/components/PowBadge";
import { Button } from "@/components/site/Button";

// The email form, set like a classified: a ruled input and an ink button.
// Headings belong to the caller; this is the input, the button, the shield
// badge and the two end states. Captcha-gated by the same invisible
// proof-of-work as the API. `source` tags where the signup came from.
type State = "idle" | "loading" | "error";

const DONE_KEY = "skopnix.waitlist.done";
const SEEN_KEY = "skopnix.waitlist.seen";

// The confirmation has to survive a refresh (see the previous version's notes):
// read through useSyncExternalStore so first paint matches the server's markup
// and other tabs stay in sync. A per-browser courtesy, not authoritative state.
const listeners = new Set<() => void>();

function subscribeDone(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function emitDone() {
  for (const l of listeners) l();
}

function readDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Waitlist({ source = "site" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");
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
        setMsg(j.error || "Something went wrong. Try again.");
      }
    } catch {
      setState("error");
      setMsg("Network error. Try again.");
    }
  }

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
      <div role="status" className="border border-ink px-4 py-3">
        <p className="font-display text-[17px] font-bold text-ink">You are on the list.</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
          One email when alerts open. Nothing else, ever: no tracking pixels, no reselling.
        </p>
        <button type="button" onClick={reset} className="label mt-2 text-ink-3 underline-offset-4 hover:text-ink hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="sr-only">Your email address</span>
          <input
            type="email"
            required
            aria-label="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => primePowToken()}
            placeholder="you@company.com"
            autoComplete="email"
            spellCheck={false}
            // A one-field mailing-list signup, not a login: these four
            // attributes stop password managers popping a vault over it.
            data-bwignore=""
            data-1p-ignore=""
            data-lpignore="true"
            data-form-type="other"
            className="ruled-input"
          />
        </label>
        <Button type="submit" size="sm" disabled={state === "loading"} glyph="→" className="shrink-0">
          {state === "loading" ? "Sending" : "Notify me"}
        </Button>
      </form>
      <div className="mt-2.5 flex items-center gap-3">
        <PowBadge />
        {state === "error" && (
          <span role="alert" className="font-mono text-[11px] text-stamp">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
