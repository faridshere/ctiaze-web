import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kevMeta,
  epssFor,
  epssMap,
  epssDetailed,
  nvdLookup,
} from "../lib/cveintel.ts";

// Records what every upstream request carried, with the network and the
// timeout factory stubbed, then restores both. No request leaves the process.
async function recordUpstreamCalls(run: () => Promise<unknown>, respond: () => Promise<Response>) {
  const realFetch = globalThis.fetch;
  const realTimeout = AbortSignal.timeout;
  const timeouts: number[] = [];
  const requests: { url: string; signal: AbortSignal | null | undefined }[] = [];
  AbortSignal.timeout = (ms: number) => {
    timeouts.push(ms);
    return realTimeout.call(AbortSignal, ms);
  };
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), signal: init?.signal });
    return respond();
  };
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
    AbortSignal.timeout = realTimeout;
  }
  return { timeouts, requests };
}

const emptyJson = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });

// Off Vercel (2026-09-24) the routes' maxDuration = 60 is ignored, so these
// per-request timeouts are the only bound on a cold /cve or /actors render
// when NVD, EPSS or KEV hangs. The call sites pass 7-9 s; this fails the day
// one is raised past 10 s.
const MAX_UPSTREAM_TIMEOUT_MS = 10_000;

test("every cveintel upstream request carries a timeout of at most 10 s", async () => {
  const { timeouts, requests } = await recordUpstreamCalls(async () => {
    await kevMeta();
    await epssFor("CVE-2024-0001");
    await epssMap(["CVE-2024-0001"]);
    await epssDetailed(["CVE-2024-0001"]);
    await nvdLookup("CVE-2024-0001");
  }, emptyJson);

  assert.equal(requests.length, 5, "one request per exported fetcher");
  assert.equal(timeouts.length, requests.length, "each request built exactly one timeout signal");
  for (const r of requests) assert.ok(r.signal, `${r.url} was sent without an abort signal`);
  for (const ms of timeouts) assert.ok(ms > 0 && ms <= MAX_UPSTREAM_TIMEOUT_MS, `timeout ${ms} ms exceeds ${MAX_UPSTREAM_TIMEOUT_MS} ms`);
});

test("a failed or timed-out upstream degrades to the empty result, never a throw", async () => {
  const abort = async (): Promise<Response> => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  };
  await recordUpstreamCalls(async () => {
    assert.equal(await nvdLookup("CVE-2024-0001"), null);
    assert.equal(await epssFor("CVE-2024-0001"), null);
    assert.equal((await epssMap(["CVE-2024-0001"])).size, 0);
  }, abort);
});
