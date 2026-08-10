import { cookies } from "next/headers";
import { normalizeLocale, type Locale } from "./i18n";

// Server-side current locale (from the cookie the proxy/toggle set). Reading it
// opts a page into dynamic rendering — used only on the tool pages. Kept separate
// from lib/i18n.ts so that (client-safe) dictionary can be imported anywhere.
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return normalizeLocale(c.get("locale")?.value);
}
