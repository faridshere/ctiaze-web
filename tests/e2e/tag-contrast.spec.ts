import { expect, test } from "@playwright/test";

// Every .tag must read at WCAG AA (4.5:1; 10.5px is small text) in both
// editions. Measured from what the browser computed, not from the tokens: the
// tag's own colour, its 11% wash composited over the real background behind
// it. Colours are resolved through a canvas so color-mix() results compare
// like any other colour. Pages without tags (an empty database) pass vacuously,
// so run this against a build with data.
const PAGES = ["/", "/news", "/az", "/claims", "/exploits", "/actors"];

for (const edition of ["day", "night"] as const) {
  test.describe(`${edition} edition`, () => {
    for (const path of PAGES) {
      test(`every .tag on ${path} is AA`, async ({ page }) => {
        await page.addInitScript((e) => localStorage.setItem("skopnix.edition", e), edition);
        await page.emulateMedia({ reducedMotion: "reduce" });
        const res = await page.goto(path);
        expect(res?.status()).toBeLessThan(400);
        const bad = await page.evaluate(() => {
          const cv = document.createElement("canvas");
          cv.width = cv.height = 1;
          const cx = cv.getContext("2d", { willReadFrequently: true })!;
          const rgba = (css: string): [number, number, number, number] => {
            cx.clearRect(0, 0, 1, 1);
            cx.fillStyle = "rgba(0,0,0,0)";
            cx.fillStyle = css;
            cx.fillRect(0, 0, 1, 1);
            const d = cx.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          };
          const over = (top: number[], under: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3]));
          const lum = (c: number[]) => {
            const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
          };
          const ratio = (a: number[], b: number[]) => {
            const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
            return (x + 0.05) / (y + 0.05);
          };
          const ground = (el: Element | null): number[] => {
            for (let n = el; n; n = n.parentElement) {
              const c = rgba(getComputedStyle(n).backgroundColor);
              if (c[3] > 0) return c[3] >= 1 ? c : over(c, ground(n.parentElement));
            }
            return rgba(getComputedStyle(document.body).backgroundColor);
          };
          const out: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>(".tag")) {
            if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue; // not rendered
            const cs = getComputedStyle(el);
            const bg = over(rgba(cs.backgroundColor), ground(el.parentElement));
            const fg = rgba(cs.color);
            const r = ratio(over(fg, bg), bg);
            if (r < 4.5) out.push(`${el.textContent?.trim()} ${cs.color} ${r.toFixed(2)}`);
          }
          return { out, n: document.querySelectorAll(".tag").length };
        });
        expect(bad.out, `${bad.n} tags checked`).toEqual([]);
      });
    }
  });
}
