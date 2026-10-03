#!/usr/bin/env node
/* Full-page screenshots of the app and the reference, plus a pixel diff.
   usage: node scripts/shot.mjs <screen|route> [width=1440] [--base http://localhost:3000] [--no-ref] [--theme dark]
   Writes .visual/<screen>-<width>-{app,ref,diff}.png and prints the share of
   differing pixels. Mock dates/counts differ by design; layout must not. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { withChrome, withPage } from "./cdp.mjs";
import { referenceUrl } from "./reference.mjs";
import { resolveScreen } from "./screens.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const noRef = args.includes("--no-ref") && args.splice(args.indexOf("--no-ref"), 1);
const base = flag("--base") ?? "http://localhost:3000";
const theme = flag("--theme");
const [target, widthArg] = args;
if (!target) {
  console.error("usage: node scripts/shot.mjs <screen|route> [width]");
  process.exit(2);
}
const width = Number(widthArg ?? 1440);
const screen = resolveScreen(target);
const outDir = resolve(".visual");
await mkdir(outDir, { recursive: true });

/* Freeze motion so reveal/transition state never decides a pixel. */
const FREEZE = `(() => {
  ${theme ? `try { localStorage.setItem("nova:theme", ${JSON.stringify(theme)}); } catch {}` : ""}
  const css = "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}";
  const add = () => { const s = document.createElement("style"); s.textContent = css; document.head.append(s); };
  document.head ? add() : document.addEventListener("DOMContentLoaded", add);
})()`;

async function capture(session, url) {
  return withPage(session, url, width, async ({ evaluate, sessionId }) => {
    await session.send("Page.addScriptToEvaluateOnNewDocument", { source: FREEZE }, sessionId);
    await session.send("Page.reload", {}, sessionId);
    await new Promise((r) => setTimeout(r, 1200));
    // next/font swaps faces in lazily: force every face to load so weights are final
    await evaluate("Promise.race([Promise.all([...document.fonts].map((f) => f.load().catch(() => null))), new Promise((r) => setTimeout(r, 10000))]).then(() => document.fonts.ready).then(() => true)");
    const height = Math.min(await evaluate("document.documentElement.scrollHeight"), 20000);
    await session.send("Emulation.setDeviceMetricsOverride",
      { width, height, deviceScaleFactor: 1, mobile: width < 769 }, sessionId);
    await evaluate(`Promise.race([
      Promise.all([...document.images].map((img) => {
        img.loading = "eager";
        return img.complete ? 0 : new Promise((r) => { img.addEventListener("load", r); img.addEventListener("error", r); });
      })),
      new Promise((r) => setTimeout(r, 25000)),
    ]).then(() => true)`);
    await new Promise((r) => setTimeout(r, 600));
    const { data } = await session.send("Page.captureScreenshot",
      { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } }, sessionId);
    return { data, height };
  }, { settle: 200 });
}

const DIFF = (a, b) => `(async () => {
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const [A, B] = await Promise.all([load("data:image/png;base64,${a}"), load("data:image/png;base64,${b}")]);
  const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height);
  const px = (img) => { const c = new OffscreenCanvas(w, h), x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const pa = px(A), pb = px(B);
  const out = new OffscreenCanvas(w, h), ox = out.getContext("2d"), od = ox.createImageData(w, h);
  let diff = 0;
  const bands = new Array(Math.ceil(h / 200)).fill(0);
  for (let i = 0; i < pa.length; i += 4) {
    const d = Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
    if (d > 48) { diff++; bands[Math.floor(i / 4 / w / 200)]++; od.data[i] = 230; od.data[i + 1] = 20; od.data[i + 2] = 60; od.data[i + 3] = 255; }
    else { const g = 255 - (255 - (pa[i] + pa[i + 1] + pa[i + 2]) / 3) * 0.25; od.data[i] = od.data[i + 1] = od.data[i + 2] = g; od.data[i + 3] = 255; }
  }
  ox.putImageData(od, 0, 0);
  const blob = await out.convertToBlob({ type: "image/png" });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { share: diff / (w * h), w, h, png: btoa(bin), bands: bands.map((n) => n / (w * 200)) };
})()`;

await withChrome(async (session) => {
  const stem = `${screen.name}-${width}${theme ? `-${theme}` : ""}`;
  const app = await capture(session, base + screen.route);
  await writeFile(resolve(outDir, `${stem}-app.png`), Buffer.from(app.data, "base64"));
  console.log(`app  ${stem}-app.png  height=${app.height}`);

  if (noRef || !screen.ref) return;
  const ref = await capture(session, referenceUrl(screen));
  await writeFile(resolve(outDir, `${stem}-ref.png`), Buffer.from(ref.data, "base64"));
  console.log(`ref  ${stem}-ref.png  height=${ref.height}`);

  const result = await withPage(session, "about:blank", 400, ({ evaluate }) => evaluate(DIFF(app.data, ref.data)), { settle: 0 });
  await writeFile(resolve(outDir, `${stem}-diff.png`), Buffer.from(result.png, "base64"));
  const worst = result.bands.map((v, i) => [i * 200, v]).filter(([, v]) => v > 0.05).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (worst.length) console.log("worst 200px bands (y: share):", worst.map(([y, v]) => `${y}: ${(v * 100).toFixed(0)}%`).join("  "));
  console.log(`diff ${stem}-diff.png  ${(result.share * 100).toFixed(2)}% pixels differ` +
    `  (height app ${app.height} vs ref ${ref.height}, Δ ${app.height - ref.height}px)`);
});
