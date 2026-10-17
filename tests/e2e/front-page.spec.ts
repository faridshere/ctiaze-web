import { test, expect, type Page } from "@playwright/test";

// The tool on page one (2026-10-17): the fold, the nav, the curl, the stamps,
// and the overflow pass every page must keep (DESIGN.md: nothing may widen
// the document past the viewport; a failure lists each OVERFLOW element).

const PAGES = ["/", "/stack", "/actors", "/claims", "/az", "/api-docs", "/news", "/about", "/no-such-page"];
const WIDTHS = [390, 1280];

async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= vw) return [];
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1) {
        out.push(`OVERFLOW ${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${(el.getAttribute("class") || "").split(/\s+/).slice(0, 3).join(".")} right=${Math.round(r.right)} vw=${vw}`);
        if (out.length >= 12) break;
      }
    }
    return out.length ? out : [`OVERFLOW document scrollWidth=${document.documentElement.scrollWidth} vw=${vw}`];
  });
}

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`no horizontal overflow at ${width}px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: "load" });
      expect(await overflowing(page)).toEqual([]);
    });
  }
}

test("above the fold at 1280px: the paste box and a real example result", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Paste what you run. See what is being exploited right now, by whom — with the report that proves it.");
  const ex = page.locator("[data-stack-example]");
  const parts = [
    page.locator("#stack-input"),
    ex.locator('a[href^="/cve/CVE-"]'),
    ex.locator(".stamp", { hasText: "KEV" }),
    ex.getByText(/^EPSS \d/),
    ex.locator("blockquote"),
    ex.locator('a[target="_blank"][href^="http"]'),
  ];
  for (const p of parts) {
    await expect(p).toBeVisible();
    const box = await p.boundingBox();
    expect(box, "element has a box").not.toBeNull();
    expect(box!.y + box!.height, "bottom edge within the first 800px").toBeLessThanOrEqual(800);
  }
  // The actor line: a dossier link or the source's own name, above the quote.
  await expect(ex.locator(".border-l-2 .label").first()).not.toBeEmpty();
});

test("nav is exactly five sections, and Exploits is off the nav and the front page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const labels = await page.locator('header nav[aria-label="Sections"] ul').first().locator("a").allTextContents();
  expect(labels.map((l) => l.trim())).toEqual(["Stack check", "Adversaries", "Claims", "Azerbaijan", "API"]);
  await expect(page.locator('main a[href="/exploits"], header a[href="/exploits"]')).toHaveCount(0);
  const footer = page.locator("footer");
  for (const label of ["Archive", "About", "Census"]) await expect(footer.getByRole("link", { name: label, exact: true })).toBeVisible();
});

test("no waitlist and no alert promises on the front page or the 404", async ({ page }) => {
  for (const path of ["/", "/no-such-page", "/stack"]) {
    await page.goto(path);
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.getByText(/email alerts are next|notify me/i)).toHaveCount(0);
  }
});

test("the curl is one line and calls the keyless stack endpoint", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No key. curl it.")).toBeVisible();
  const curl = (await page.locator("[data-stack-curl]").textContent()) ?? "";
  expect(curl).not.toContain("\n");
  expect(curl).toMatch(/^curl -s https:\/\/skopnix\.com\/api\/v1\/stack -H 'content-type: application\/json' -d '\{"components":\[.+\]\}'$/);
  expect(curl.toLowerCase()).not.toMatch(/key|token|authorization/);
});

test("every front-page module carries a stamp from its own data, plus one pipeline line", async ({ page }) => {
  await page.goto("/");
  const stamps = await page.locator("[data-asof]").allInnerTexts();
  expect(stamps.length).toBeGreaterThanOrEqual(5);
  for (const s of stamps) expect(s).toMatch(/^as of (\d{1,2} [A-Z][a-z]{2} )?\d{2}:\d{2} UTC$/i);
  await expect(page.locator("[data-pipeline-health]")).toHaveText(/Pipeline: [\d,]+ sources delivered in the last 24 h · [\d,]+ cited CVE–actor pairs/);
});
