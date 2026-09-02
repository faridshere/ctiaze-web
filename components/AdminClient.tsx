"use client";

import { useState } from "react";

// Token form. The token is POSTed once and exchanged for an httpOnly cookie —
// it never goes in the URL, so it can't leak through Referer or browser history.
export function AdminLogin() {
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) location.reload();
      else setErr((await r.json().catch(() => ({}))).error || "Wrong token.");
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold text-ink-primary">Admin</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
        Enter the admin token. It&apos;s the <code className="font-mono text-ink-primary">ADMIN_TOKEN</code> you set
        in the Vercel environment variables.
      </p>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="admin token"
        autoComplete="current-password"
        className="mt-5 w-full rounded-sm border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="mt-3 w-full rounded-sm bg-brand px-5 py-2.5 font-display text-sm font-medium text-[#170a03] disabled:opacity-50"
      >
        {busy ? "…" : "Open dashboard"}
      </button>
      {err && <p className="mt-3 font-mono text-[12px] text-accent-critical">{err}</p>}
    </form>
  );
}

export function AdminTools({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(what: "list" | "csv") {
    const text = what === "list" ? emails.join(", ") : "email\n" + emails.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
    location.reload();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => copy("list")} className="rounded-sm border border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-secondary hover:border-brand hover:text-ink-primary">
        {copied === "list" ? "copied ✓" : "copy emails"}
      </button>
      <button onClick={() => copy("csv")} className="rounded-sm border border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-secondary hover:border-brand hover:text-ink-primary">
        {copied === "csv" ? "copied ✓" : "copy as csv"}
      </button>
      <button onClick={logout} className="ml-auto rounded-sm border border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink-primary">
        sign out
      </button>
    </div>
  );
}
