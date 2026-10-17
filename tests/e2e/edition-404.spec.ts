import { expect, test } from "@playwright/test";

// A saved edition must survive a 404. Two kinds of 404 render differently: an
// unmatched path gets the server-rendered not-found page (the inline
// EDITION_SCRIPT runs), while notFound() from a dynamic, on-demand ISR route
// is served as Next's bare error shell and rendered on the client, where the
// inline script never runs (2026-10-17: data-edition was null there).
// EditionReplay covers that path; this spec holds both.
const PATHS = ["/bad-slug", "/news/no-such-dispatch-zz9", "/actors/no-such-adversary-zz9"];
const PAPER = { day: "rgb(244, 240, 230)", night: "rgb(11, 10, 8)" };

for (const edition of ["day", "night"] as const) {
  // The saved choice has to beat the OS preference, so run it against the opposite one too.
  for (const scheme of ["light", "dark"] as const) {
    test.describe(`saved ${edition}, OS ${scheme}`, () => {
      test.use({ colorScheme: scheme });

      for (const path of PATHS) {
        test(`${path} keeps the ${edition} edition with no flash`, async ({ page }) => {
          await page.addInitScript((e) => {
            localStorage.setItem("skopnix.edition", e);
            // Every frame from the first one: once the page's content exists,
            // the attribute must already be the saved edition.
            const frames: (string | null)[] = [];
            (window as unknown as { __frames: (string | null)[] }).__frames = frames;
            const tick = () => {
              if (document.getElementById("main")) frames.push(document.documentElement.getAttribute("data-edition"));
              if (frames.length < 30) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }, edition);

          const res = await page.goto(path);
          expect(res?.status()).toBe(404);
          await expect(page.getByRole("heading", { name: "That link's gone. The wire isn't." })).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute("data-edition", edition);
          await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(PAPER[edition]);

          const frames = await page.evaluate(() => (window as unknown as { __frames: (string | null)[] }).__frames);
          expect(frames.length).toBeGreaterThan(0);
          expect(frames.filter((f) => f !== edition)).toEqual([]);
        });
      }
    });
  }
}
