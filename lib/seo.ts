import type { Metadata } from "next";

// Shared hreflang/canonical helper. PURE — must never import next/headers (that
// breaks the client build; see lib/i18n memory). The rationale (from the story
// page): each ?dil= variant is SELF-canonical so Google indexes both languages;
// an alternate that canonicalizes elsewhere is deduped and its hreflang ignored.
// The bare URL keeps the bare canonical + x-default; a junk ?dil falls back to it.

const SITE = "https://ctiaze.tech";

export function dilAlternates(path: string, dil?: string): NonNullable<Metadata["alternates"]> {
  const url = `${SITE}${path}`;
  const canonical = dil === "az" ? `${url}?dil=az` : dil === "en" ? `${url}?dil=en` : url;
  return {
    canonical,
    languages: { az: `${url}?dil=az`, en: `${url}?dil=en`, "x-default": url },
  };
}

// One-call localized page metadata (title + description + self-canonical hreflang +
// matching og:url). Used by the home + hub pages so they finally expose an
// indexable Azerbaijani URL instead of Googlebot only ever seeing the EN render.
export function localizedMeta(opts: {
  path: string;
  dil?: string;
  en: boolean;
  azTitle: string;
  enTitle: string;
  azDesc: string;
  enDesc: string;
}): Metadata {
  const title = opts.en ? opts.enTitle : opts.azTitle;
  const description = opts.en ? opts.enDesc : opts.azDesc;
  const alternates = dilAlternates(opts.path, opts.dil);
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical as string },
  };
}
