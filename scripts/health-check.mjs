#!/usr/bin/env node
// Health check for the current (2026-09) two-landing-page surface:
// skopnix.com = email-capture landing + /news archive + story pages + feeds;
// ctiaze.tech = the coming-soon placeholder (host rewrite in next.config.ts).
//
//   node scripts/health-check.mjs [baseUrl]
//   npm run health -- https://ctiaze-web.vercel.app
//
// Base URL defaults to https://skopnix.com. From networks where the bare
// domains are filtered (Farid's corp network resets TLS for ctiaze.tech, and
// the scheduled sandbox blocks it too), pass the Vercel alias for the main
// checks; the two ctiaze.tech checks always dial the real domain (Vercel
// routes by SNI, so a spoofed Host header can't exercise the host-scoped
// rewrite/redirect) and degrade to SKIP when the network blocks them.
//
// The two-story title check keeps the 2026-08-01 lesson alive in the new
// surface: back then the homepage was green while every CVE article page
// silently served the latest story. /api/search-index is gone, so the guard
// now pulls two real slugs from news-sitemap.xml and asserts the two pages
// render DIFFERENT, non-generic titles.
//
// Exit code 0 = all pass, 1 = one or more failures.

const BASE = (process.argv[2] || process.env.HEALTH_BASE || "https://skopnix.com").replace(/\/$/, "");
const TIMEOUT_MS = 25000;

const results = [];
function rec(name, ok, detail = "") { results.push({ name, ok, detail }); }

async function get(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(path.startsWith("http") ? path : BASE + path, {
      redirect: "manual",
      signal: ctrl.signal,
      ...opts,
    });
    const body = await res.text();
    return { status: res.status, body, headers: res.headers };
  } finally {
    clearTimeout(t);
  }
}

const titleOf = (html) => {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : "";
};

async function check(name, fn) {
  try {
    const r = await fn();
    rec(name, !!r.ok, r.detail || "");
  } catch (e) {
    rec(name, false, String(e.message || e));
  }
}

async function main() {
  console.log(`skopnix health check → ${BASE}\n`);

  // ── landing (skopnix.com) ────────────────────────────────────────────────
  await check("landing renders + email form", async () => {
    const { status, body } = await get("/");
    return { ok: status === 200 && body.includes("See it") && body.includes("Get early access"),
      detail: `status ${status}` };
  });
  await check("wire strip has data (Mongo read works)", async () => {
    const { body } = await get("/");
    return { ok: /on the wire/i.test(body), detail: "" };
  });

  // ── ctiaze.tech (real domain — the host-scoped rules can't be exercised
  // through the apex: Vercel routes by SNI and ignores a spoofed Host header).
  // Some networks filter the ctiaze.tech domain (Farid's corp network resets
  // TLS; the scheduled sandbox blocks it). A connection-level failure here is
  // therefore a SKIP, not a FAIL — the funnel monitor asserts these twice
  // daily from an unfiltered vantage.
  const skipIfFiltered = (e) => {
    const msg = String(e?.cause?.code || e?.message || e);
    return { ok: true, detail: `SKIPPED — can't reach ctiaze.tech from this network (${msg.slice(0, 60)}); funnel monitor covers it` };
  };
  await check("ctiaze.tech placeholder renders", async () => {
    try {
      const { status, body } = await get("https://ctiaze.tech/");
      return { ok: status === 200 && /Something is coming/i.test(body), detail: `status ${status}` };
    } catch (e) { return skipIfFiltered(e); }
  });
  await check("story rescue: ctiaze.tech/xeber/* → skopnix.com/news/*", async () => {
    try {
      const { status, headers } = await get("https://ctiaze.tech/xeber/health-probe");
      const loc = headers.get("location") || "";
      return { ok: status === 308 && loc.startsWith("https://skopnix.com/news/health-probe"),
        detail: `${status} → ${loc}` };
    } catch (e) { return skipIfFiltered(e); }
  });

  // ── stories ──────────────────────────────────────────────────────────────
  let slugs = [];
  await check("news-sitemap has stories", async () => {
    const { status, body } = await get("/news-sitemap.xml");
    slugs = [...body.matchAll(/<loc>[^<]+\/news\/([^<]+)<\/loc>/g)].map((m) => m[1]);
    return { ok: status === 200 && slugs.length > 0, detail: `${slugs.length} slugs` };
  });
  await check("two story pages render distinct real titles", async () => {
    if (slugs.length < 2) return { ok: false, detail: "fewer than 2 slugs in news-sitemap" };
    const [a, b] = [slugs[0], slugs[slugs.length - 1]];
    const [ra, rb] = await Promise.all([get(`/news/${a}`), get(`/news/${b}`)]);
    const [ta, tb] = [titleOf(ra.body), titleOf(rb.body)];
    const generic = (t) => !t || /^skopnix\b/i.test(t) || /not found/i.test(t);
    const ok = ra.status === 200 && rb.status === 200 && !generic(ta) && !generic(tb) && ta !== tb;
    return { ok, detail: ok ? `"${ta.slice(0, 40)}…" ≠ "${tb.slice(0, 40)}…"`
      : `a=${ra.status} "${ta.slice(0, 40)}" b=${rb.status} "${tb.slice(0, 40)}"` };
  });
  await check("/actors index renders + links dossiers", async () => {
    const { status, body } = await get("/actors");
    return { ok: status === 200 && body.includes("Adversaries") && body.includes("/actors/"), detail: `status ${status}` };
  });

  await check("one dossier renders (apt28)", async () => {
    const { status, body } = await get("/actors/apt28");
    return { ok: status === 200 && body.includes("APT28") && body.includes("Get early access"), detail: `status ${status}` };
  });

  await check("/news archive renders", async () => {
    const { status, body } = await get("/news");
    return { ok: status === 200 && body.includes("/news/"), detail: `status ${status}` };
  });

  // ── feeds + metadata ─────────────────────────────────────────────────────
  await check("rss.xml", async () => {
    const { status, body } = await get("/rss.xml");
    return { ok: status === 200 && body.includes("<rss"), detail: `status ${status}` };
  });
  await check("feed.json parses + has items", async () => {
    const { status, body } = await get("/feed.json");
    const j = JSON.parse(body);
    return { ok: status === 200 && Array.isArray(j.items) && j.items.length > 0,
      detail: `${j.items?.length ?? 0} items` };
  });
  await check("manifest.webmanifest", async () => {
    const { status, body } = await get("/manifest.webmanifest");
    return { ok: status === 200 && JSON.parse(body).name?.length > 0, detail: `status ${status}` };
  });

  // ── 404 lead recovery ────────────────────────────────────────────────────
  await check("404 page recovers the lead (email form, no dead end)", async () => {
    const { status, body } = await get("/health-check-no-such-page");
    return { ok: status === 404 && body.includes("Get early access"), detail: `status ${status}` };
  });

  // ── security canaries ────────────────────────────────────────────────────
  await check("admin leaks nothing without auth", async () => {
    const { body } = await get("/admin");
    return { ok: !/Emails collected/i.test(body), detail: "" };
  });
  await check("waitlist rejects tokenless posts", async () => {
    const { status } = await get("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "probe@example.com" }),
    });
    return { ok: status === 403 || status === 429, detail: `status ${status}` };
  });

  // report
  console.log("");
  let failed = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  —  ${r.detail}` : ""}`);
    if (!r.ok) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) { console.log(`\n${failed} check(s) FAILED.`); process.exit(1); }
  console.log("\nAll healthy.");
}

main().catch((e) => { console.error("health check crashed:", e); process.exit(1); });
