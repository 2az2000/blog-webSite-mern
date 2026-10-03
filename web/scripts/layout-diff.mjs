#!/usr/bin/env node
/* Element-level diff against the reference.
   Every element that owns visible text (or is an image) is measured in both
   pages: box, font, colour, spacing. They are paired by text, in document
   order, and the differences are listed top to bottom — so the first line is
   the first thing that is wrong, and everything after it may just be shifted.
   usage: node scripts/layout-diff.mjs <screen|route> [width=1440] [--base http://localhost:3000] [--all] [--tol 0.6]
   --all   also list elements whose only difference is a vertical shift of the same amount as the one before. */
import { withChrome, withPage } from "./cdp.mjs";
import { referenceUrl } from "./reference.mjs";
import { resolveScreen } from "./screens.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args.splice(i, 2)[1];
};
const showAll = args.includes("--all") && args.splice(args.indexOf("--all"), 1);
const base = flag("--base", "http://localhost:3000");
const tol = Number(flag("--tol", "0.6"));
const [target, widthArg] = args;
if (!target) {
  console.error("usage: node scripts/layout-diff.mjs <screen|route> [width]");
  process.exit(2);
}
const width = Number(widthArg ?? 1440);
const screen = resolveScreen(target);

const MEASURE = `(() => {
  const out = [];
  const seen = new Set();
  const norm = (s) => s.replace(/\\s+/g, " ").trim();
  // resolve any CSS colour (srgb / oklab / rgb) to the pixel it paints
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const px = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return d[3] === 0 ? "transparent" : "rgba(" + d[0] + "," + d[1] + "," + d[2] + "," + (d[3] / 255).toFixed(2) + ")"; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    const tag = el.tagName.toLowerCase();
    if (["script", "style", "noscript", "svg", "path", "next-route-announcer", "nextjs-portal"].includes(tag)) continue;
    if (el.closest("nextjs-portal, [data-nextjs-toast], #toastRegion, [data-sonner-toaster]")) continue;
    let key = "";
    for (const n of el.childNodes) if (n.nodeType === 3) key += n.textContent;
    key = norm(key);
    const isImg = tag === "img";
    if (!key && !isImg) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    // next/image rewrites src to /_next/image?url=<encoded original>
    let src = el.getAttribute("src") || "";
    const um = src.match(/[?&]url=([^&]+)/);
    if (um) src = decodeURIComponent(um[1]);
    const k = isImg ? "img:" + src.split("/").pop().split("?")[0].replace(/\.(jpg|png|webp)$/, "").slice(-24) : key.slice(0, 48);
    out.push({
      key: k,
      tag,
      x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height,
      fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing,
      color: px(cs.color), ff: cs.fontFamily.split(",")[0].replace(/["']/g, ""),
      tt: cs.textTransform, td: cs.textDecorationLine, ta: cs.textAlign,
      bg: px(cs.backgroundColor), op: cs.opacity,
    });
  }
  return out;
})()`;

async function measure(session, url) {
  return withPage(
    session,
    url,
    width,
    async ({ evaluate, sessionId }) => {
      await session.send("Page.addScriptToEvaluateOnNewDocument", {
        source: `(() => { const s = document.createElement("style"); s.textContent = "*,*::before,*::after{animation:none!important;transition:none!important}"; document.addEventListener("DOMContentLoaded", () => document.head.append(s)); })()`,
      }, sessionId);
      await session.send("Page.reload", {}, sessionId);
      await new Promise((r) => setTimeout(r, 1500));
      await evaluate("Promise.race([Promise.all([...document.fonts].map((f) => f.load().catch(() => null))), new Promise((r) => setTimeout(r, 10000))]).then(() => true)");
      await evaluate("Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }); })).then(() => true)");
      await new Promise((r) => setTimeout(r, 500));
      return evaluate(MEASURE);
    },
    { settle: 200 },
  );
}

const refUrl = referenceUrl(screen);

const [app, ref] = await withChrome(async (session) => [
  await measure(session, base + screen.route),
  await measure(session, refUrl),
]);

/* pair by key, k-th occurrence with the k-th occurrence */
const bucket = (list) => {
  const m = new Map();
  for (const e of list) (m.get(e.key) ?? m.set(e.key, []).get(e.key)).push(e);
  return m;
};
const A = bucket(app);
const R = bucket(ref);

const rows = [];
let missingInApp = 0;
for (const [key, refs] of R) {
  const apps = A.get(key) ?? [];
  refs.forEach((r, i) => {
    const a = apps[i];
    if (!a) {
      missingInApp++;
      rows.push({ y: r.y, text: `${key}`, diffs: ["MISSING in app"] });
      return;
    }
    const diffs = [];
    const dy = a.y - r.y;
    const dx = a.x - r.x;
    if (Math.abs(dx) > tol) diffs.push(`x ${r.x.toFixed(1)}→${a.x.toFixed(1)} (${dx > 0 ? "+" : ""}${dx.toFixed(1)})`);
    if (Math.abs(dy) > tol) diffs.push(`y ${r.y.toFixed(1)}→${a.y.toFixed(1)} (${dy > 0 ? "+" : ""}${dy.toFixed(1)})`);
    if (Math.abs(a.w - r.w) > tol) diffs.push(`w ${r.w.toFixed(1)}→${a.w.toFixed(1)}`);
    if (Math.abs(a.h - r.h) > tol) diffs.push(`h ${r.h.toFixed(1)}→${a.h.toFixed(1)}`);
    // images: only geometry matters (their "colour" is the surrounding text colour)
    for (const p of r.tag === "img" ? [] : ["fs", "fw", "lh", "ls", "color", "ff", "tt", "td", "ta", "op"]) {
      if (a[p] !== r[p]) diffs.push(`${p} ${r[p]}→${a[p]}`);
    }
    if (r.tag !== "img" && a.bg !== r.bg) diffs.push(`bg ${r.bg}→${a.bg}`);
    if (diffs.length) rows.push({ y: r.y, text: key, tag: r.tag, dy, diffs });
  });
}
rows.sort((p, q) => p.y - q.y);

/* a pure vertical shift equal to the previous one is a consequence, not a cause */
let lastShift = 0;
const shown = [];
for (const row of rows) {
  const onlyShift = row.diffs.length === 1 && row.diffs[0].startsWith("y ");
  if (!showAll && onlyShift && Math.abs(row.dy - lastShift) <= tol) continue;
  if (onlyShift) lastShift = row.dy;
  else if (row.dy !== undefined && row.diffs.some((d) => d.startsWith("y "))) lastShift = row.dy;
  shown.push(row);
}

console.log(`${screen.name} @ ${width}: app ${app.length} text/img elements, reference ${ref.length}; ${rows.length} differ, ${missingInApp} missing in app`);
for (const row of shown.slice(0, 40)) {
  console.log(`${String(Math.round(row.y)).padStart(5)}  ${(row.tag ?? "").padEnd(7)} ${JSON.stringify(row.text.slice(0, 34)).padEnd(38)} ${row.diffs.join("  ")}`);
}
if (shown.length > 40) console.log(`… ${shown.length - 40} more`);
