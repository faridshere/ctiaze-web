// The locale type the live (English-only) tree still carries through a few
// shared components so the shelved Azerbaijani tools can reuse them unchanged.
export type Locale = "az" | "en";

export function normalizeLocale(v: string | undefined | null): Locale {
  return v === "en" ? "en" : "az";
}
