"use client";

import { useEffect, useState } from "react";
import { getPowToken, primePowToken } from "@/lib/pow-client";
import { PowBadge } from "@/components/PowBadge";

// Early-access capture: visitors drop an email for free access to more tools +
// their own login when it opens. Captcha-gated (same invisible PoW as the tools)
// so the list can't be spammed. `source` tags where the signup came from.
export function Waitlist({ source = "site", compact = false }: { source?: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => { primePowToken(); }, []);

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
      const j = await r.json().catch(() => ({}));
      if (r.ok) setState("done");
      else { setState("error"); setMsg(j.error || "Something went wrong — try again."); }
    } catch {
      setState("error");
      setMsg("Network error — try again.");
    }
  }

  if (state === "done") {
    return (
      <div className={`mx-auto ${compact ? "max-w-xl" : "max-w-2xl"} rounded-md border border-accent-good/30 bg-accent-good/[0.06] px-5 py-4 text-center`}>
        <p className="font-display text-lg font-semibold text-ink-primary">You&apos;re on the list.</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-secondary">
          We&apos;ll email you when your free access is ready. No spam — just the invite.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-2xl text-center"}>
      {!compact && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">Early access</p>
          <h2 className="mt-3 font-display text-[clamp(1.6rem,3.5vw,2.4rem)] font-semibold tracking-[-0.02em] text-ink-primary">
            Want the keys?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink-secondary">
            Drop your email for <b className="font-medium text-ink-primary">free early access</b> — more tools,
            deeper data, and your own login when it opens. No spam, just the invite.
          </p>
        </>
      )}
      <form onSubmit={submit} className={`${compact ? "" : "mt-6"} flex flex-col gap-2 sm:flex-row ${compact ? "" : "mx-auto max-w-md"}`}>
        <label className="relative flex flex-1 items-center">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            spellCheck={false}
            className="w-full rounded-sm border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 rounded-sm bg-brand px-5 py-2.5 font-display text-sm font-medium text-[#170a03] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Get early access →"}
        </button>
      </form>
      <div className={`mt-2.5 flex items-center ${compact ? "" : "justify-center"} gap-3`}>
        <PowBadge />
        {state === "error" && <span className="font-mono text-[11px] text-accent-critical">{msg}</span>}
      </div>
    </div>
  );
}
