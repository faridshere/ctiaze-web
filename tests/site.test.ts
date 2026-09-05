import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE_URL, absoluteUrl, storyUrl } from "../lib/site.ts";

test("absoluteUrl joins the canonical origin with a leading-slash path", () => {
  assert.equal(absoluteUrl("/cve"), `${SITE_URL}/cve`);
  assert.equal(absoluteUrl("/"), `${SITE_URL}/`);
});

test("absoluteUrl adds the missing leading slash", () => {
  assert.equal(absoluteUrl("cve"), `${SITE_URL}/cve`);
});

test("storyUrl builds the stable /news/<slug> permalink", () => {
  assert.equal(storyUrl("abc123-example-story"), `${SITE_URL}/news/abc123-example-story`);
});
