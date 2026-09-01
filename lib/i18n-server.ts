import { type Locale } from "./i18n";

// English-only, globally. The locale is fixed, so this needs no cookie read — and
// crucially, NOT calling cookies() lets every page render statically / ISR instead
// of as a per-request function. That's the difference between the site costing
// Fluid Active CPU on every visit vs. being served from the CDN cache for ~free.
export async function getLocale(): Promise<Locale> {
  return "en";
}
