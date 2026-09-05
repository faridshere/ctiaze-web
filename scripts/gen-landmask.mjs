// Regenerates lib/data/landmask.ts — a coarse land/ocean mask derived from our own
// NASA day texture (equirectangular): ocean pixels are blue-dominant, land is
// green/brown/white. The dot map (components/actors/DotMap.tsx) draws each land
// row as one dashed stroke, so the whole world ships as a few KB of TS.
//   node scripts/gen-landmask.mjs            # rewrite lib/data/landmask.ts
//   node scripts/gen-landmask.mjs --ascii    # also print a preview
import { createRequire } from "node:module";
import fs from "node:fs";
const sharp = createRequire(import.meta.url)("sharp");
const W = 200, H = 100;
const texture = new URL("../public/textures/earth-day.jpg", import.meta.url).pathname;
const out = new URL("../lib/data/landmask.ts", import.meta.url).pathname;

const { data } = await sharp(texture).resize(W, H, { fit: "fill", kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rows = [];
for (let y = 0; y < H; y++) {
  let row = "";
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const ocean = b > r + 8 && b > g + 2 && !(r > 200 && g > 200);
    row += ocean ? "0" : "1";
  }
  rows.push(row);
}
if (process.argv.includes("--ascii")) for (let y = 0; y < H; y += 2) console.log(rows[y].replace(/0/g, ".").replace(/1/g, "#"));
const land = rows.join("").split("").filter((c) => c === "1").length;
fs.writeFileSync(
  out,
  `// Coarse land mask (${W}×${H}, equirectangular) derived from public/textures/earth-day.jpg\n// by scripts/gen-landmask.mjs — row-major, "1" = land. Powers the dotted targeting map.\nexport const LAND_W = ${W};\nexport const LAND_H = ${H};\nexport const LAND_ROWS: string[] = ${JSON.stringify(rows)};\n`,
);
console.log(`wrote lib/data/landmask.ts — ${land} land cells of ${W * H} (${((100 * land) / (W * H)).toFixed(1)}%)`);
