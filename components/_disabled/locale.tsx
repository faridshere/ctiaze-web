"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/_disabled/i18n";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ value, children }: { value: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// Locale for any client component — provided server-side by the root layout, so
// SSR and hydration agree (no flash).
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function setLocale(next: Locale) {
  document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  window.location.reload();
}

export function LocaleToggle() {
  const loc = useLocale();
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
