// Slug ↔ _id round-trip for story permalinks. Pure and dependency-free on purpose
// so the round-trip is unit-testable (node --test) without pulling in mongodb/react.
//
// The engine stamps _id with a stable prefix (cve:/url:/digest:/spike:). slugify
// strips that prefix, keeps the first 12 chars as a collision-proof key, and
// appends a title slug. getStoryBySlug must recover that SAME key to match the _id
// via a `^(prefix)<key>` regex — so slugify and storyIdKey are two halves of one
// contract and must stay in lockstep (see lib/slug.test.ts).

const ID_PREFIX = /^(cve:|url:|digest:|spike:)/;

export function slugify(id: string, titleAz: string): string {
  const base = titleAz
    .toLowerCase()
    .replace(/[^a-z0-9əıöüğşç\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  // id already carries a stable hash/cve — prefix it so the slug is always
  // unique and stable even if two titles collide or a title is empty.
  const shortId = id.replace(ID_PREFIX, "").slice(0, 12);
  return `${shortId}-${base}`.replace(/-+$/, "");
}

// Recover the stable id key from a slug. slugify joins shortId to the title with a
// '-', so when the stripped id is shorter than 12 chars the first 12 slug chars end
// with that join hyphen — e.g. digest ids are exactly 11 chars ("AZ-2026-W33"), so
// slug.slice(0,12) = "AZ-2026-W33-". Left in, the `^(prefix)AZ-2026-W33-` regex
// demands a trailing hyphen the _id ("digest:AZ-2026-W33") doesn't have, so every
// digest permalink 404s. Strip the trailing hyphen to restore the exact key.
// CVE (>=13 chars: "CVE-2026-1234"), spike (13: "AZ-2026-08-05") and url (hex hash)
// ids never end in a join hyphen at position 12, so their behavior is unchanged.
export function storyIdKey(slug: string): string {
  return slug.slice(0, 12).replace(/-+$/, "");
}
