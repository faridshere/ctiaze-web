import { test } from "node:test";
import assert from "node:assert/strict";
import { refHost } from "../lib/referrer.ts";

test("refHost keeps what the beacon sends: a bare host", () => {
  assert.equal(refHost("t.me"), "t.me");
  assert.equal(refHost("www.Google.com"), "www.google.com");
  assert.equal(refHost("localhost:3000"), "localhost:3000");
});

test("refHost reduces a full URL to its host", () => {
  assert.equal(refHost("https://news.ycombinator.com/item?id=1"), "news.ycombinator.com");
});

test("refHost drops anything that is not a host", () => {
  for (const bad of ["", "javascript:alert(1)", "<script>", "a b.com", "-bad.com", "x".repeat(300), "ftp://x.com"]) {
    assert.equal(refHost(bad), "", bad);
  }
});
