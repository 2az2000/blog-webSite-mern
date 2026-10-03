#!/usr/bin/env node
/* Crop a region of a PNG (e.g. a .visual screenshot) so a detail can be inspected.
   usage: node scripts/crop.mjs <in.png> <x> <y> <w> <h> [out.png] [--scale 2] */
import { readFile, writeFile } from "node:fs/promises";

import { withChrome, withPage } from "./cdp.mjs";

const args = process.argv.slice(2);
const si = args.indexOf("--scale");
const scale = si === -1 ? 1 : Number(args.splice(si, 2)[1]);
const [input, x, y, w, h, out = input.replace(/\.png$/, `-crop-${x}-${y}.png`)] = args;
const data = (await readFile(input)).toString("base64");

const png = await withChrome((s) =>
  withPage(s, "about:blank", 400, ({ evaluate }) =>
    evaluate(`(async () => {
      const img = new Image(); img.src = "data:image/png;base64,${data}"; await img.decode();
      const c = new OffscreenCanvas(${w} * ${scale}, ${h} * ${scale}); const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, ${x}, ${y}, ${w}, ${h}, 0, 0, ${w} * ${scale}, ${h} * ${scale});
      const buf = new Uint8Array(await (await c.convertToBlob({ type: "image/png" })).arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(bin);
    })()`), { settle: 0 }));
await writeFile(out, Buffer.from(png, "base64"));
console.log(out);
