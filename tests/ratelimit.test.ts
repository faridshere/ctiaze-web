import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, limitCaller, clientIp, clientGeo, ipBucket, networkPrefix, parseTrustedProxy, type TrustedProxy } from "../lib/ratelimit.ts";

test("rateLimit allows exactly N requests in a window, then denies", () => {
  const key = `test-window:${Math.random()}`;
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit(key, 5, 60_000), true, `request ${i + 1} of 5 should be allowed`);
  }
  assert.equal(rateLimit(key, 5, 60_000), false, "the 6th request in the same window must be denied");
});

test("each key gets its own independent bucket", () => {
  const a = `a:${Math.random()}`;
  const b = `b:${Math.random()}`;
  assert.equal(rateLimit(a, 1, 60_000), true);
  assert.equal(rateLimit(a, 1, 60_000), false);
  assert.equal(rateLimit(b, 1, 60_000), true, "a different key must not be affected by a's count");
});

const VERCEL: TrustedProxy = { kind: "vercel" };
const CLOUDFLARE: TrustedProxy = { kind: "cloudflare" };
const NONE: TrustedProxy = { kind: "none" };

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com", { headers });
}

// Every header a client can type for itself. Off Vercel none of these is
// overwritten by the proxy, so each is a spoof attempt in cloudflare mode.
const SPOOFED = {
  "x-real-ip": "6.6.6.6",
  "x-forwarded-for": "6.6.6.1, 6.6.6.2",
  "x-vercel-ip-country": "KP",
  "x-vercel-ip-city": "Pyongyang",
  "cf-ipcity": "Pyongyang",
};

// --- parsing TRUSTED_PROXY ---------------------------------------------------

test("TRUSTED_PROXY defaults to vercel when unset or blank", () => {
  assert.deepEqual(parseTrustedProxy(undefined), VERCEL);
  assert.deepEqual(parseTrustedProxy("  "), VERCEL);
});

test("TRUSTED_PROXY accepts each documented mode, ignoring case and padding", () => {
  assert.deepEqual(parseTrustedProxy("vercel"), VERCEL);
  assert.deepEqual(parseTrustedProxy(" Cloudflare "), CLOUDFLARE);
  assert.deepEqual(parseTrustedProxy("none"), NONE);
  assert.deepEqual(parseTrustedProxy("xff:2"), { kind: "xff", hops: 2 });
});

test("TRUSTED_PROXY rejects unknown values and malformed hop counts", () => {
  for (const bad of ["cloudfront", "cf", "xff", "xff:", "xff:0", "xff:-1", "xff:1.5", "xff:100", "true"]) {
    assert.equal(parseTrustedProxy(bad), null, `"${bad}" must not parse`);
  }
});

type RateLimitModule = typeof import("../lib/ratelimit.ts");

// The mode is read once, when the module loads, so an env test needs a fresh
// module instance: a distinct query string makes Node evaluate it again.
async function loadWithTrustedProxy(value: string, tag: string): Promise<RateLimitModule> {
  const saved = process.env.TRUSTED_PROXY;
  process.env.TRUSTED_PROXY = value;
  try {
    return (await import(`../lib/ratelimit.ts?${tag}`)) as RateLimitModule;
  } finally {
    if (saved === undefined) delete process.env.TRUSTED_PROXY;
    else process.env.TRUSTED_PROXY = saved;
  }
}

test("an unknown TRUSTED_PROXY fails safe to none and says so once", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const fresh = await loadWithTrustedProxy("cloudfalre", "typo");
  assert.equal(fresh.clientIp(req({ "x-real-ip": "1.2.3.4", "cf-connecting-ip": "5.6.7.8" })), "unknown");
  assert.equal(fresh.clientIp(req({ "x-real-ip": "9.9.9.9" })), "unknown");
  assert.equal(log.mock.callCount(), 1);
});

test("clientIp and clientGeo use the mode from the environment by default", async () => {
  const fresh = await loadWithTrustedProxy("cloudflare", "cloudflare");
  const r = req({ ...SPOOFED, "cf-connecting-ip": "5.6.7.8", "cf-ipcountry": "AZ" });
  assert.equal(fresh.clientIp(r), "5.6.7.8");
  assert.deepEqual(fresh.clientGeo(r), { country: "AZ", city: null });
});

// --- vercel (today's behaviour, unchanged) -----------------------------------

test("vercel: clientIp prefers x-real-ip over x-forwarded-for", () => {
  assert.equal(clientIp(req({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 8.8.8.8" }), VERCEL), "1.2.3.4");
});

test("vercel: clientIp falls back to the RIGHTMOST x-forwarded-for hop (the trusted proxy's own append)", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8, 7.7.7.7" }), VERCEL), "7.7.7.7");
});

test("vercel: clientIp is 'unknown' with no IP headers at all", () => {
  assert.equal(clientIp(req(), VERCEL), "unknown");
});

test("vercel: clientGeo reads x-vercel-ip-country and x-vercel-ip-city", () => {
  const r = req({ "x-vercel-ip-country": "AZ", "x-vercel-ip-city": "Baku", "cf-ipcountry": "US" });
  assert.deepEqual(clientGeo(r, VERCEL), { country: "AZ", city: "Baku" });
  assert.deepEqual(clientGeo(req(), VERCEL), { country: null, city: null });
});

test("the module default (TRUSTED_PROXY unset in tests) is vercel", () => {
  assert.equal(clientIp(req({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })), "1.2.3.4");
  assert.deepEqual(clientGeo(req({ "x-vercel-ip-country": "AZ" })), { country: "AZ", city: null });
});

// --- cloudflare ---------------------------------------------------------------

test("cloudflare: clientIp is CF-Connecting-IP", () => {
  assert.equal(clientIp(req({ "cf-connecting-ip": " 5.6.7.8 " }), CLOUDFLARE), "5.6.7.8");
  assert.equal(clientIp(req({ "cf-connecting-ip": "2001:db8::1" }), CLOUDFLARE), "2001:db8::1");
});

test("cloudflare: a spoofed x-real-ip or X-Forwarded-For is ignored", () => {
  assert.equal(clientIp(req({ ...SPOOFED, "cf-connecting-ip": "5.6.7.8" }), CLOUDFLARE), "5.6.7.8");
});

test("cloudflare: without CF-Connecting-IP the caller is 'unknown', never a client header", () => {
  assert.equal(clientIp(req(SPOOFED), CLOUDFLARE), "unknown");
  assert.equal(clientIp(req({ ...SPOOFED, "cf-connecting-ip": "  " }), CLOUDFLARE), "unknown");
});

test("cloudflare: rotating a spoofed x-real-ip cannot mint a fresh rate-limit bucket", () => {
  const key = (spoof: string) =>
    `test-cf:${clientIp(req({ "x-real-ip": spoof, "x-forwarded-for": spoof, "cf-connecting-ip": "5.6.7.8" }), CLOUDFLARE)}`;
  const run = Math.random();
  assert.equal(rateLimit(`${key("1.1.1.1")}:${run}`, 1, 60_000), true);
  assert.equal(rateLimit(`${key("2.2.2.2")}:${run}`, 1, 60_000), false, "same CF-Connecting-IP, same bucket");
});

test("cloudflare: clientGeo takes the country from CF-IPCountry and ignores spoofed geo", () => {
  assert.deepEqual(clientGeo(req({ ...SPOOFED, "cf-ipcountry": "AZ" }), CLOUDFLARE), { country: "AZ", city: null });
  assert.deepEqual(clientGeo(req(SPOOFED), CLOUDFLARE), { country: null, city: null });
});

test("cloudflare: country XX (unknown) is null, T1 (Tor) is kept, junk is dropped", () => {
  const country = (value: string) => clientGeo(req({ "cf-ipcountry": value }), CLOUDFLARE).country;
  assert.equal(country("XX"), null);
  assert.equal(country("T1"), "T1");
  assert.equal(country("az"), "AZ");
  assert.equal(country("AZE"), null);
  assert.equal(country("<script>"), null);
});

// --- xff:<n> -----------------------------------------------------------------

test("xff:<n>: the client is the n-th X-Forwarded-For hop from the right", () => {
  const r = req({ "x-real-ip": "6.6.6.6", "x-forwarded-for": "6.6.6.1, 1.2.3.4, 10.0.0.2" });
  assert.equal(clientIp(r, { kind: "xff", hops: 1 }), "10.0.0.2");
  assert.equal(clientIp(r, { kind: "xff", hops: 2 }), "1.2.3.4");
});

test("xff:<n>: fewer hops than trusted proxies is 'unknown', never the leftmost", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": "6.6.6.1" }), { kind: "xff", hops: 2 }), "unknown");
  assert.equal(clientIp(req(), { kind: "xff", hops: 1 }), "unknown");
});

test("xff:<n>: no header carries trusted geo", () => {
  assert.deepEqual(clientGeo(req(SPOOFED), { kind: "xff", hops: 1 }), { country: null, city: null });
});

// --- none ----------------------------------------------------------------------

test("none: every caller is 'unknown' with no geo, whatever it sends", () => {
  const r = req({ ...SPOOFED, "cf-connecting-ip": "5.6.7.8", "cf-ipcountry": "AZ" });
  assert.equal(clientIp(r, NONE), "unknown");
  assert.deepEqual(clientGeo(r, NONE), { country: null, city: null });
});

// --- the rate-limit key: IPv6 by /64 -------------------------------------------

test("ipBucket keeps IPv4 and 'unknown' as they are", () => {
  assert.equal(ipBucket("5.6.7.8"), "5.6.7.8");
  assert.equal(ipBucket("unknown"), "unknown");
});

test("ipBucket keys IPv6 on its /64, whatever the spelling", () => {
  assert.equal(ipBucket("2001:db8:1:2::1"), "2001:db8:1:2::/64");
  assert.equal(ipBucket("2001:0DB8:0001:0002:ffff:ffff:ffff:ffff"), "2001:db8:1:2::/64");
  assert.equal(ipBucket("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(ipBucket("::1"), "0:0:0:0::/64");
  assert.equal(ipBucket("2001:db8:1:3::1"), "2001:db8:1:3::/64", "the next /64 is another subscriber");
});

test("ipBucket keys an IPv4-mapped address as its IPv4, not the shared ::ffff:0:0/64", () => {
  assert.equal(ipBucket("::ffff:5.6.7.8"), "5.6.7.8");
  assert.equal(ipBucket("::FFFF:5.6.7.9"), "5.6.7.9");
});

test("ipBucket leaves anything that is not an address untouched", () => {
  for (const odd of ["1::2::3", "2001:db8:1:2:3:4:5:6:7", "2001:db8:1:2:3:4:5", "2001:db8::g", "fe80::1%eth0", "64:ff9b::1.2.3.4"]) {
    assert.equal(ipBucket(odd), odd, odd);
  }
});

test("networkPrefix gives the wider network the PoW binding uses: IPv4 /24, IPv6 /48", () => {
  assert.equal(networkPrefix("198.51.100.7", 24, 48), "198.51.100.0/24");
  assert.equal(networkPrefix("::ffff:198.51.100.7", 24, 48), "198.51.100.0/24");
  assert.equal(networkPrefix("2001:db8::1", 24, 48), "2001:db8:0::/48");
  assert.equal(networkPrefix("2001:0DB8:0000:ffff::9", 24, 48), "2001:db8:0::/48");
  assert.equal(networkPrefix("unknown", 24, 48), "unknown");
});

// Routes rate-limit only through limitCaller(), which builds the key itself,
// so no route can key on the raw address (2026-09-24, review: the source-grep
// guard this replaces missed any spelling but `${clientIp(req)}` and `${ip}`).
test("cloudflare: rotating addresses inside one IPv6 /64 cannot mint fresh rate-limit buckets", () => {
  const name = `test-v6:${Math.random()}`;
  const allowed = Array.from({ length: 50 }, (_, i) =>
    limitCaller(req({ "cf-connecting-ip": `2001:db8:1:2::${(i + 1).toString(16)}` }), name, 6, 60_000, CLOUDFLARE),
  ).filter(Boolean).length;
  assert.equal(allowed, 6, "one /64 is one caller");
  assert.equal(limitCaller(req({ "cf-connecting-ip": "2001:db8:1:3::1" }), name, 6, 60_000, CLOUDFLARE), true, "a different /64 has its own bucket");
});

test("limitCaller keeps separate budgets per name for one caller", () => {
  const caller = req({ "cf-connecting-ip": "5.6.7.8" });
  const run = Math.random();
  assert.equal(limitCaller(caller, `a:${run}`, 1, 60_000, CLOUDFLARE), true);
  assert.equal(limitCaller(caller, `a:${run}`, 1, 60_000, CLOUDFLARE), false);
  assert.equal(limitCaller(caller, `b:${run}`, 1, 60_000, CLOUDFLARE), true);
});
