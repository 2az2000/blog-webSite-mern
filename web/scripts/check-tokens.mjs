#!/usr/bin/env node
/* Style rules that a linter cannot see (CLAUDE.md "Styling"):
     1. every custom theme key in globals.css is known to cn() (src/lib/utils.ts)
     2. no CSS Modules, no stylesheet besides app/globals.css
        (src/styles/ is tolerated while the migration runs: docs/05-roadmap.md)
     3. no hex colours and no @apply in components
     4. arbitrary values are reported, so each one is a conscious decision
   usage: node scripts/check-tokens.mjs        exit 1 on a rule violation */
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

/* 1 · theme keys ⇄ cn() */
const css = await readFile(join(root, "src/app/globals.css"), "utf8");
const theme = css.slice(css.indexOf("@theme static {"), css.indexOf("@layer base {"));
const utils = await readFile(join(root, "src/lib/utils.ts"), "utf8");

const DEFAULT_CONTAINERS = new Set(["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "prose"]);
const groups = {
  text: { re: /--text-([a-z0-9-]+):/g, skip: (k) => k.includes("--") },
  leading: { re: /--leading-([a-z0-9-]+):/g },
  tracking: { re: /--tracking-([a-z0-9-]+):/g },
  weight: { re: /--font-weight-([a-z0-9-]+):/g },
  shadow: { re: /--shadow-([a-z0-9-]+):/g },
  spacing: { re: /--spacing-([a-z0-9-]+):/g },
  container: { re: /--container-([a-z0-9-]+):/g, skip: (k) => DEFAULT_CONTAINERS.has(k) },
};

for (const [group, { re, skip }] of Object.entries(groups)) {
  const listMatch = utils.match(new RegExp(`\\n  ${group}: \\[([\\s\\S]*?)\\]`));
  const known = new Set([...(listMatch?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  for (const [, key] of theme.matchAll(re)) {
    if (skip?.(key)) continue;
    if (!known.has(key)) errors.push(`theme key --${group === "weight" ? "font-weight" : group}-${key} is missing from THEME_KEYS.${group} in src/lib/utils.ts`);
  }
}

/* 1b · a name in two namespaces is ambiguous: max-w-x resolves --spacing-x
   before --container-x, so the container value silently loses. */
const names = (re) => new Set([...theme.matchAll(re)].map((m) => m[1]));
const spacingNames = names(/--spacing-([a-z0-9-]+):/g);
for (const key of names(/--container-([a-z0-9-]+):/g)) {
  if (spacingNames.has(key)) errors.push(`--spacing-${key} and --container-${key} collide: rename one`);
}

/* 2–4 · files */
const files = await walk(join(root, "src"));
for (const file of files) {
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel.endsWith(".module.css")) errors.push(`${rel}: CSS Modules are not allowed (ADR 002)`);
  else if (rel.endsWith(".css") && rel !== "src/app/globals.css" && !rel.startsWith("src/styles/")) {
    errors.push(`${rel}: the only stylesheet is src/app/globals.css`);
  }
  if (!/\.(tsx?|jsx?)$/.test(rel)) continue;
  const text = await readFile(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    const at = `${rel}:${i + 1}`;
    if (/#[0-9a-fA-F]{3,8}\b/.test(line) && /className|class=|style=|color|fill|stroke/.test(line) && !rel.endsWith("app/layout.tsx")) {
      errors.push(`${at}: hex colour in a component; use a colour token`);
    }
    if (/@apply/.test(line)) errors.push(`${at}: @apply is not allowed`);
    for (const m of line.matchAll(/(?:^|[\s"'`])((?:[a-z0-9-]+:)*-?[a-z][a-z0-9-]*-\[[^\]\s]+\])/g)) {
      warnings.push(`${at}: arbitrary value ${m[1]}`);
    }
  });
}

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${errors.length} error(s), ${warnings.length} arbitrary value(s)`);
process.exit(errors.length ? 1 : 0);
