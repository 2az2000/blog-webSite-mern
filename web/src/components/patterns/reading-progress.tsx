"use client";

import { useEffect, useRef } from "react";

/**
 * .reading-progress — 3px accent bar fixed to the top of the viewport (reference nova.css §11).
 * Hidden from assistive technology — the article's headings carry the structure.
 * Writes the width straight to the DOM inside rAF: no React render per scroll.
 *
 * @param targetId element whose reading is measured; defaults to the page.
 */
export function ReadingProgress({ targetId }: { targetId?: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const target = (targetId && document.getElementById(targetId)) || document.body;
      const rect = target.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      if (bar.current) bar.current.style.width = `${total <= 0 ? 100 : (done / total) * 100}%`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [targetId]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-120 h-0.75 bg-transparent print:hidden">
      <div ref={bar} className="h-full w-0 bg-brand transition-[width] duration-80 ease-linear" />
    </div>
  );
}
