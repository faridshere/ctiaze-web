import { expect, test } from "@playwright/test";

// The wire must not read empty on load (2026-10-17: rows armed only at
// hydration and started at 0.45s, so the first row was opaque at ~1.0s and
// rows already painted were hidden again). The stagger is capped at 0.5s and
// runs in CSS from first paint. Needs a front page with wire rows.
test.describe("the wire on first paint", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __row: { firstAt: number | null; opaqueAt: number | null; hiddenAgain: boolean } };
      w.__row = { firstAt: null, opaqueAt: null, hiddenAgain: false };
      const tick = () => {
        const row = document.querySelector(".wire-row");
        if (row) {
          const o = parseFloat(getComputedStyle(row).opacity);
          const t = performance.now();
          w.__row.firstAt ??= t;
          if (o >= 0.99) w.__row.opaqueAt ??= t;
          else if (w.__row.opaqueAt !== null) w.__row.hiddenAgain = true;
        }
        if (performance.now() < 3000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });

  test("no row waits more than 0.5s to start", async ({ page }) => {
    await page.goto("/");
    const rows = page.locator(".wire-row");
    test.skip((await rows.count()) === 0, "the front page has no wire rows (empty database)");
    const delays = await rows.evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).animationDelay)));
    expect(Math.max(...delays)).toBeLessThanOrEqual(0.5);
    expect(delays[0]).toBe(0);
  });

  test("the first row is fully visible within 0.5s of first paint and stays visible", async ({ page }) => {
    await page.goto("/");
    test.skip((await page.locator(".wire-row").count()) === 0, "the front page has no wire rows (empty database)");
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => (window as unknown as { __row: { firstAt: number | null; opaqueAt: number | null; hiddenAgain: boolean } }).__row);
    expect(r.firstAt).not.toBeNull();
    expect(r.opaqueAt).not.toBeNull();
    expect(r.opaqueAt! - r.firstAt!).toBeLessThanOrEqual(500);
    expect(r.hiddenAgain).toBe(false);
  });

  test("reduced motion prints the rows at once", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const rows = page.locator(".wire-row");
    test.skip((await rows.count()) === 0, "the front page has no wire rows (empty database)");
    const ops = await rows.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(ops.every((o) => o === "1")).toBe(true);
    await ctx.close();
  });
});
