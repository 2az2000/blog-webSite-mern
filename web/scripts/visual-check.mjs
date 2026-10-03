#!/usr/bin/env node
/* Overflow + console audit.
   usage: node scripts/visual-check.mjs [screen|route ...] [--widths 390,1440] [--base http://localhost:3000] [--all-widths]
   No screen argument = every reference screen. Exit code 1 on any failure. */
import { withChrome, withPage } from "./cdp.mjs";
import { SCREENS, WIDTHS, resolveScreen } from "./screens.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const allWidths = args.includes("--all-widths") && args.splice(args.indexOf("--all-widths"), 1);
const base = flag("--base") ?? "http://localhost:3000";
const widths = allWidths ? WIDTHS : (flag("--widths")?.split(",").map(Number) ?? [390, 1440]);
const screens = args.length ? args.map(resolveScreen) : SCREENS;

let failed = 0;
await withChrome(async (session) => {
  for (const screen of screens) {
    for (const width of widths) {
      await withPage(session, base + screen.route, width, async ({ evaluate, errors }) => {
        const m = await evaluate(`(() => {
          const doc = document.documentElement;
          const wide = [...document.querySelectorAll("body *")]
            .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 3)
            .map((el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + "." + [...el.classList].slice(0, 3).join("."));
          return { scroll: doc.scrollWidth, viewport: innerWidth, wide };
        })()`);
        // Next dev overlays log hydration/404 noise for the deliberate 404 route.
        const realErrors = errors.filter((e) => !(screen.name === "404" && /404|Not Found/i.test(e)));
        const ok = m.scroll <= m.viewport && realErrors.length === 0;
        if (!ok) failed++;
        const status = ok ? "ok  " : "FAIL";
        console.log(`${status} ${screen.name.padEnd(14)} ${String(width).padStart(4)}  scroll=${m.scroll}` +
          (m.scroll > m.viewport ? `  overflow: ${m.wide.join(", ")}` : "") +
          (realErrors.length ? `  errors: ${realErrors.join(" | ")}` : ""));
      });
    }
  }
});
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
