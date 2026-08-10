"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

function readCookie(): Locale {
  if (typeof document === "undefined") return "az";
  const m = document.cookie.match(/(?:^|;\s*)locale=(az|en)/);
  return m ? (m[1] as Locale) : "az";
}

// Client locale for chrome (Header/Footer). SSR renders 'az' (or an optional
// server-provided initial), then syncs to the cookie on mount.
export function useLocale(initial: Locale = "az"): Locale {
  const [loc, setLoc] = useState<Locale>(initial);
  useEffect(() => {
    const ck = readCookie();
    if (ck !== loc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time cookie sync on mount to correct the SSR default
      setLoc(ck);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return loc;
}

export function setLocale(next: Locale) {
  document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}

export function LocaleToggle({ initial = "az" }: { initial?: Locale }) {
  const loc = useLocale(initial);
  const other: Locale = loc === "az" ? "en" : "az";
  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      aria-label={loc === "az" ? "Switch to English" : "Azərbaycancaya keç"}
      className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-ink-secondary transition-colors hover:border-brand hover:text-ink-primary"
    >
      <span className={loc === "az" ? "text-ink-primary" : ""}>AZ</span>
      <span className="mx-1 text-ink-muted">/</span>
      <span className={loc === "en" ? "text-ink-primary" : ""}>EN</span>
    </button>
  );
}
