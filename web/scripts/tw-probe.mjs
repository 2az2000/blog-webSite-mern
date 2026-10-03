#!/usr/bin/env node
/* Print the CSS Tailwind generates for some utilities, against the real
   theme in src/app/globals.css (or --css <file>). Use it to confirm that a
   translated reference rule compiles to the reference values.
   usage: node scripts/tw-probe.mjs "text-h4 leading-120 max-md:px-6" [--css file] [--theme] */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";

const args = process.argv.slice(2);
const cssIdx = args.indexOf("--css");
const file = resolve(cssIdx === -1 ? "src/app/globals.css" : args.splice(cssIdx, 2)[1]);
const showTheme = args.includes("--theme") && args.splice(args.indexOf("--theme"), 1);
const classes = args.join(" ");

// Compile only the requested classes: no project scan, no legacy imports.
const source =
  (await readFile(file, "utf8"))
    .replace(/@import\s+"tailwindcss"\s*;/, '@import "tailwindcss" source(none);')
    .replace(/(@import\s+"tailwindcss\/utilities\.css"\s+layer\(utilities\))\s*;/, "$1 source(none);")
    .replace(/@import\s+"\.\.\/styles\/[^"]+"\s*;/g, "") +
  `\n@source inline(${JSON.stringify(classes)});\n`;

const { css } = await postcss([tailwind({ base: dirname(file) })]).process(source, { from: file });

function pick(layer) {
  const start = css.indexOf(`@layer ${layer} {`);
  if (start === -1) return "";
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  return css.slice(start);
}

console.log(pick("utilities") || "(no utilities generated: unknown class?)");
if (showTheme) console.log(pick("theme"));
