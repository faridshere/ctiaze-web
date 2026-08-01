#!/usr/bin/env node
// Health check for ctiaze.tech.
//
//   node scripts/health-check.mjs [baseUrl]
//   npm run health -- https://ctiaze-web.vercel.app
//
// Base URL defaults to https://ctiaze.tech. The scheduled overnight session's
// network filter blocks the bare ctiaze.tech domain, so pass the Vercel alias
// there:  node scripts/health-check.mjs https://ctiaze-web.vercel.app
//
// Beyond hitting "/" and "/api/latest", this loads a real CVE article page and a
// real URL-hash article page and asserts each <title> matches its slug's story.
// That is the check that was missing on 2026-08-01, when the homepage was fully
// green while every /xeber/<CVE-slug> page served the wrong (latest CVE) article.
//
// Exit code 0 = all pass, 1 = one or more failures.

const BASE = (process.argv[2] || process.env.HEALTH_BASE || "https://ctiaze.tech").replace(/\/$/, "");
const TIMEOUT_MS = 20000;

const results = [];
function rec(name, ok, detail = "") { results.push({ name, ok, detail }); }

async function get(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, { redirect: "manual", signal: ctrl.signal });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

const norm = (s) => (s || "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
const titleOf = (html) => {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s*[—-]\s*ctiaze\s*$/i, "").trim() : "";
};

async function checkStatus(path, want = 200) {
  try {
    const { status } = await get(path);
    rec(`GET ${path}`, status === want, `status ${status} (want ${want})`);
  } catch (e) {
    rec(`GET ${path}`, false, String(e.message || e));
  }
}

async function checkLatestCount() {
  try {
    const { status, body } = await get("/api/latest");
    const json = JSON.parse(body);
    const ok = status === 200 && Number.isInteger(json.count) && json.count > 0;
    rec("/api/latest sane count", ok, `count=${json.count}`);
    return json.count;
  } catch (e) {
    rec("/api/latest sane count", false, String(e.message || e));
    return null;
  }
}

// The core regression guard: load a real article page and confirm the rendered
// <title> matches the story the slug points to (not the latest story).
async function checkArticle(label, entry) {
  if (!entry) { rec(`article title match (${label})`, false, "no slug of this kind in search-index"); return; }
  try {
    const { status, body } = await get(`/xeber/${encodeURIComponent(entry.slug)}`);
    const pageTitle = titleOf(body);
    const want = norm(entry.titleAz).slice(0, 24);
    const ok = status === 200 && want.length > 4 && norm(pageTitle).includes(want);
    rec(`article title match (${label})`, ok,
      ok ? `"${pageTitle.slice(0, 46)}…"` : `slug=${entry.slug.slice(0, 28)} want≈"${entry.titleAz.slice(0, 40)}" got="${pageTitle.slice(0, 40)}"`);
  } catch (e) {
    rec(`article title match (${label})`, false, String(e.message || e));
  }
}

async function main() {
  console.log(`ctiaze health check → ${BASE}\n`);

  // 1. core pages
  for (const p of ["/", "/cve", "/ioc", "/exposure", "/kripto", "/haqqinda"]) await checkStatus(p, 200);
  // 2. feeds
  for (const p of ["/rss.xml", "/feed.json"]) await checkStatus(p, 200);
  // 3. data layer
  const count = await checkLatestCount();
  await checkStatus("/api/search-index", 200);

  // 4. article pages — one CVE slug + one URL-hash slug (they use different slug
  //    prefixes; the 2026-08-01 bug hit CVE slugs only).
  let cve = null, hash = null;
  try {
    const { body } = await get("/api/search-index");
    const idx = JSON.parse(body);
    cve = idx.find((e) => /^CVE-/i.test(e.slug)) || null;
    hash = idx.find((e) => !/^CVE-/i.test(e.slug)) || null;
  } catch (e) {
    rec("load search-index for article checks", false, String(e.message || e));
  }
  await checkArticle("CVE slug", cve);
  await checkArticle("URL-hash slug", hash);

  // report
  console.log("");
  let failed = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  —  ${r.detail}` : ""}`);
    if (!r.ok) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} passed${count != null ? ` · ${count} stories live` : ""}`);
  if (failed) { console.log(`\n${failed} check(s) FAILED.`); process.exit(1); }
  console.log("\nAll healthy.");
}

main().catch((e) => { console.error("health check crashed:", e); process.exit(1); });
