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

test("azExposure is null when nothing was measured, and populated when it was", () => {
  const zero = toStory(minimalDoc({ az_exposure: { product: "FortiGate", count: 0, as_of: "2026-09-01" } }));
  assert.equal(zero.azExposure, null);

  const nonZero = toStory(minimalDoc({ az_exposure: { product: "FortiGate", count: 12, as_of: "2026-09-01" } }));
  assert.deepEqual(nonZero.azExposure, {
    product: "FortiGate", count: 12, globalCount: null,
    asOf: "2026-09-01", asOfIso: "", globalAsOfIso: "",
  });
});

test("a worldwide-only exposure still surfaces (global site leads with it)", () => {
  // measured worldwide but absent from the Azerbaijan sweep: dropping this would
  // silence the exposure signal for most of the catalogue
  const worldOnly = toStory(minimalDoc({
    az_exposure: { product: "MikroTik", count: 0, global_count: 196473, as_of_iso: "2026-09-07" },
  }));
  assert.equal(worldOnly.azExposure?.globalCount, 196473);
  assert.equal(worldOnly.azExposure?.count, 0);
});

test("cvss and epss are null when 0, and pass through when set", () => {
  const zeroed = toStory(minimalDoc({ cvss: 0, epss: 0 }));
  assert.equal(zeroed.cvss, null);
  assert.equal(zeroed.epss, null);

  const scored = toStory(minimalDoc({ cvss: 9.8, epss: 0.42 }));
  assert.equal(scored.cvss, 9.8);
  assert.equal(scored.epss, 0.42);
});

// --- global framing ----------------------------------------------------------
// An Azerbaijan-only count must never be presented to an English reader as a
// worldwide figure, and an Azerbaijani month abbreviation ("03 sen") must never
// reach the English site.
test("English exposure line leads worldwide and never says 'sen'", async () => {
  const { exposureLine } = await import("../lib/storysignal.ts");
  const worldwide = toStory(minimalDoc({
    az_exposure: {
      product: "MikroTik", count: 356, global_count: 196473,
      as_of: "03 sen", as_of_iso: "2026-09-03", global_as_of_iso: "2026-09-06",
    },
  }));
  const line = exposureLine(worldwide, "en")!;
  assert.match(line, /exposed worldwide/);
  assert.ok(!/Azerbaijan/i.test(line), "no Azerbaijan framing when a worldwide figure exists");
  assert.ok(!/\bsen\b/.test(line), `Azerbaijani month leaked: ${line}`);
  // the worldwide count carries ITS OWN measurement date, not the AZ sweep's
  assert.match(line, /\(06 Sep\)$/, `expected the global measurement date, got: ${line}`);
});

test("an AZ-only count is published but labelled as a regional sample", async () => {
  const { exposureLine, storyActions } = await import("../lib/storysignal.ts");
  const azOnly = toStory(minimalDoc({
    az_exposure: { product: "MikroTik", count: 356, as_of: "03 sen", as_of_iso: "2026-09-03" },
  }));
  const line = exposureLine(azOnly, "en")!;
  // it must never be passed off as worldwide, but suppressing it entirely would
  // throw away real telemetry
  assert.ok(!/worldwide/.test(line), `an AZ-only count must not claim worldwide: ${line}`);
  assert.match(line, /regional sample only/);
  assert.match(line, /\(03 Sep\)$/);
  assert.ok(storyActions(azOnly, "en").some((l) => /regional sample/.test(l)));
});

// --- source-truncated bodies -------------------------------------------------
// Feeds publish truncated descriptions, so a body can arrive ending mid-word.
// Rendering that verbatim reads as a broken scraper; three reviewers named it
// the worst thing about the content.
test("a mid-word body is cut back to the last complete sentence", async () => {
  const { completeSentences } = await import("../lib/format.ts");
  const real =
    "Attackers are exploiting MikroTik routers, according to CERT Polska's warning, " +
    "published on September 5. Successful attacks date to at least September 2. " +
    "The Hacker News's September 6 review of the warning found no victim count or";
  const out = completeSentences(real);
  assert.ok(out.endsWith("…"), "must signal that text was dropped");
  assert.ok(!/victim count or/.test(out), "must not keep the dangling fragment");
  assert.match(out, /at least September 2\./, "must keep the last whole sentence");
});

test("a complete body is left exactly as-is", async () => {
  const { completeSentences } = await import("../lib/format.ts");
  const done = "A complete sentence that ends properly.";
  assert.equal(completeSentences(done), done);
});

// --- signal honesty ----------------------------------------------------------
test("severity is derived from sev_rank, not the absent severity field", () => {
  // the pipeline stores sev_rank only; reading doc.severity gave null on all 434
  assert.equal(toStory(minimalDoc({ sev_rank: 4 })).severity, "critical");
  assert.equal(toStory(minimalDoc({ sev_rank: 3 })).severity, "high");
  assert.equal(toStory(minimalDoc({ sev_rank: 0 })).severity, null, "0 means unknown, not low");
});

test("EPSS is suppressed on a KEV story (they answer different questions)", async () => {
  const { epssBadge, signalExplainer } = await import("../lib/storysignal.ts");
  // EPSS predicts; KEV observes. "EPSS 2%" beside KEV reads as "2% risk" on
  // something actively exploited — the opposite of the truth.
  const kevStory = toStory(minimalDoc({ kev: true, epss: 0.02 }));
  assert.equal(epssBadge(kevStory), null);
  assert.match(signalExplainer(kevStory)!, /seen exploited in real attacks/);

  const predicted = toStory(minimalDoc({ kev: false, epss: 0.83 }));
  assert.equal(epssBadge(predicted), "EPSS 83%");
  assert.match(signalExplainer(predicted)!, /forecast, not a report/);
});
