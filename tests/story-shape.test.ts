import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// lib/types.ts imports slugify from lib/slug.ts via an extensionless relative
// specifier (see tests/ts-ext-loader.mjs for why that needs a resolve hook
// under Node's native test runner). Must run before the dynamic import below.
// Deliberately does NOT import lib/db or lib/stories (network/Mongo) — toStory
// is the pure mapping function, importable on its own.
register("./ts-ext-loader.mjs", import.meta.url);
const { toStory } = await import("../lib/types.ts");

function minimalDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "cve:CVE-2026-9999",
    title: "Example story title",
    url: "https://primary.example/a",
    source: "primary.example",
    ...overrides,
  };
}

test("slug is derived from the _id prefix (first 12 chars, case kept) + the title", () => {
  const story = toStory(minimalDoc());
  assert.equal(story.slug, "CVE-2026-999-example-story-title");
  assert.equal(story.id, "cve:CVE-2026-9999");
});

test("altSources is deduped by URL and excludes the primary url", () => {
  const story = toStory(
    minimalDoc({
      alt_sources: [
        { url: "https://primary.example/a" }, // same as primary — excluded
        { url: "https://other.example/b" },
        { url: "https://other.example/b" }, // duplicate — excluded on 2nd occurrence
        { url: "" }, // empty — excluded
        { url: "https://third.example/c" },
      ],
    })
  );
  assert.deepEqual(story.altSources, ["https://other.example/b", "https://third.example/c"]);
});

test("azExposure is null when the count is 0, and populated when it is not", () => {
  const zero = toStory(minimalDoc({ az_exposure: { product: "FortiGate", count: 0, as_of: "2026-09-01" } }));
  assert.equal(zero.azExposure, null);

  const nonZero = toStory(minimalDoc({ az_exposure: { product: "FortiGate", count: 12, as_of: "2026-09-01" } }));
  assert.deepEqual(nonZero.azExposure, { product: "FortiGate", count: 12, asOf: "2026-09-01" });
});

test("cvss and epss are null when 0, and pass through when set", () => {
  const zeroed = toStory(minimalDoc({ cvss: 0, epss: 0 }));
  assert.equal(zeroed.cvss, null);
  assert.equal(zeroed.epss, null);

  const scored = toStory(minimalDoc({ cvss: 9.8, epss: 0.42 }));
  assert.equal(scored.cvss, 9.8);
  assert.equal(scored.epss, 0.42);
});
