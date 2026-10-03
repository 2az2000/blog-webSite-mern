#!/usr/bin/env node
/* Viewport screenshots for the README, written to ../screenshots/.
   usage: node scripts/readme-shots.mjs [--base http://localhost:3000]   (a running app is required) */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { withChrome, withPage } from "./cdp.mjs";

const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const base = bi === -1 ? "http://localhost:3000" : args[bi + 1];
const out = resolve("..", "screenshots");

const SHOTS = [
  { file: "home.png", route: "/", width: 1440, height: 1000 },
  { file: "home-dark.png", route: "/", width: 1440, height: 1000, theme: "dark" },
  { file: "article.png", route: "/article/context-software", width: 1440, height: 1000 },
  { file: "longform.png", route: "/longform/grid-rebuild", width: 1440, height: 1000 },
  { file: "design-system.png", route: "/design-system", width: 1440, height: 1000, scroll: 1500 },
  { file: "mobile-home.png", route: "/", width: 390, height: 844 },
  { file: "mobile-menu.png", route: "/", width: 390, height: 844, click: "button[aria-label='Open menu']" },
];

const oi = args.indexOf("--only");
const only = oi === -1 ? null : args[oi + 1].split(",");
await mkdir(out, { recursive: true });
await withChrome(async (session) => {
  for (const shot of SHOTS) {
    if (only && !only.includes(shot.file)) continue;
    await withPage(session, base + shot.route, shot.width, async ({ evaluate, sessionId, errors }) => {
      await session.send("Page.addScriptToEvaluateOnNewDocument", {
        source: `(() => {
          try { localStorage.setItem("nova:theme", "${shot.theme ?? "light"}"); } catch {}
          const s = document.createElement("style");
          s.textContent = "*,*::before,*::after{animation-duration:0s!important;transition:none!important}";
          document.addEventListener("DOMContentLoaded", () => document.head.append(s));
        })()`,
      }, sessionId);
      await session.send("Page.reload", {}, sessionId);
      await new Promise((r) => setTimeout(r, 1500));
      await evaluate("Promise.race([Promise.all([...document.fonts].map((f) => f.load().catch(() => null))), new Promise((r) => setTimeout(r, 8000))]).then(() => true)");
      await evaluate("Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }); })).then(() => true)");
      if (shot.click) await evaluate(`document.querySelector(${JSON.stringify(shot.click)})?.click()`);
      if (shot.scroll) await evaluate(`window.scrollTo(0, ${shot.scroll})`);
      await new Promise((r) => setTimeout(r, 700));
      const { data } = await session.send("Page.captureScreenshot", { format: "png" }, sessionId);
      await writeFile(resolve(out, shot.file), Buffer.from(data, "base64"));
      console.log(shot.file, errors.length ? "ERRORS: " + errors.join(" | ").slice(0, 600) : "");
    }, { height: shot.height, settle: 200 });
  }
});
