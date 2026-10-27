import { ImageResponse } from "next/og";

/*
 * The default link preview (1200×630): what a chat or social app shows when a
 * page that has no picture of its own is shared. A story shows its lead photo
 * instead (see each page's metadata).
 */

export const alt = "NOVA — Ideas, stories, and perspectives shaping tomorrow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// An image is drawn outside the stylesheet, so the brand values are written out here once.
const INK = "#111111";
const PAPER = "#F7F6F2";
const ACCENT = "#1B3BFF";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: INK, color: PAPER, padding: 80 }}>
        <div style={{ display: "flex", alignItems: "flex-end", fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>
          NOVA
          <div style={{ width: 22, height: 22, borderRadius: 11, background: ACCENT, marginLeft: 10, marginBottom: 22 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 56, lineHeight: 1.15, maxWidth: 900 }}>Ideas, stories, and perspectives shaping tomorrow.</div>
          <div style={{ fontSize: 28, opacity: 0.6 }}>Independent reporting on technology, business, science, design and culture.</div>
        </div>
      </div>
    ),
    size,
  );
}
