/* Where to open a reference screen from.
   Normally that is the file in ../blog-refrence. A few screens ship a defect that
   hides content the page was plainly meant to show; for those the tools open a
   patched temporary copy (the original is never modified), so the comparison is
   against the intended page. Each patch is listed, with the reason, in
   docs/04-fidelity.md §Reference defects. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REF_DIR = resolve("..", "blog-refrence");

const PATCHES = {
  /* design-system.html calls NOVA.qs(selector) as if it were querySelectorAll,
     but NOVA.qs reads a query-string parameter. The script throws at its first
     line, so every generated specimen stays empty. */
  "design-system.html": (html) => html.replaceAll("NOVA.qs('", "document.querySelectorAll('"),
};

export function referenceUrl(screen) {
  const [file, query] = screen.ref.split("?");
  const patch = PATCHES[file];
  if (!patch) return pathToFileURL(join(REF_DIR, file)).href + (query ? `?${query}` : "");

  const html = patch(readFileSync(join(REF_DIR, file), "utf8")).replace(
    "<head>",
    `<head><base href="${pathToFileURL(REF_DIR).href}/">`,
  );
  const dir = join(tmpdir(), "nova-reference");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, file);
  writeFileSync(out, html);
  return pathToFileURL(out).href + (query ? `?${query}` : "");
}
