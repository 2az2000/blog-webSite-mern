#!/usr/bin/env node
/* Screenshot of one interaction state, app and reference side by side.
   Each side gets a click-script: a list of CSS selectors / visible texts to click in order.
   usage: node scripts/shot-state.mjs <screen> <width> --app "<click>" --ref "<click>" [--out name] [--base url]
     <click> = "css:<selector>" | "text:<button text>", several joined with " > "
   Writes .visual/state-<out>-{app,ref}.png (viewport only: that is what a state looks like). */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { withChrome, withPage } from "./cdp.mjs";
import { referenceUrl } from "./reference.mjs";
import { resolveScreen } from "./screens.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args.splice(i, 2)[1];
};
const base = flag("--base", "http://localhost:3000");
const appSteps = flag("--app", "");
const refSteps = flag("--ref", "");
const out = flag("--out", "state");
const [target, widthArg] = args;
const screen = resolveScreen(target);
const width = Number(widthArg ?? 1440);

const clickScript = (steps) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const step of ${JSON.stringify(steps.split(" > ").filter(Boolean))}) {
    const [kind, ...rest] = step.split(":");
    const arg = rest.join(":");
    const el = kind === "css"
      ? document.querySelector(arg)
      : [...document.querySelectorAll("button, a, [role=button], [role=tab], [role=menuitemradio]")].find((e) => e.textContent.trim().startsWith(arg));
    if (!el) return "NOT FOUND: " + step;
    el.click();
    await wait(600);
  }
  return "ok";
})()`;

async function capture(session, url, steps, file) {
  return withPage(session, url, width, async ({ evaluate, sessionId }) => {
    await session.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => { const s = document.createElement("style"); s.textContent = "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}"; document.addEventListener("DOMContentLoaded", () => document.head.append(s)); })()`,
    }, sessionId);
    await session.send("Page.reload", {}, sessionId);
    await new Promise((r) => setTimeout(r, 1500));
    await evaluate("Promise.race([Promise.all([...document.fonts].map((f) => f.load().catch(() => null))), new Promise((r) => setTimeout(r, 8000))]).then(() => true)");
    const result = steps ? await evaluate(clickScript(steps)) : "ok";
    if (result !== "ok") console.log(file, result);
    await new Promise((r) => setTimeout(r, 500));
    const { data } = await session.send("Page.captureScreenshot", { format: "png" }, sessionId);
    await writeFile(file, Buffer.from(data, "base64"));
    console.log(file);
  }, { settle: 200 });
}

await mkdir(resolve(".visual"), { recursive: true });
await withChrome(async (session) => {
  await capture(session, base + screen.route, appSteps, resolve(".visual", `state-${out}-app.png`));
  await capture(session, referenceUrl(screen), refSteps, resolve(".visual", `state-${out}-ref.png`));
});
