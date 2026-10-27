"use client";

import { useEffect, useState } from "react";

import { BookmarkButton, useShare } from "@/components/patterns/actions";
import { Button, flex, IconButton, IconShare, refLink } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import { formatIndex } from "@/lib/format";
import { track } from "@/lib/reader-api";
import { cn } from "@/lib/utils";

/* Interactive reading-surface parts (reference article.html / longform.html scripts). */

/** Seconds on the page before reaching the end counts as having read it, not scrolled past it. */
const MIN_READ_SECONDS = 20;

/**
 * Counts the visit, and — once the reader has been here a while and the end of the
 * piece (`endId`) has come into view — the finished read that ranks the trending board.
 * Renders nothing; a counter that fails never gets in the reader’s way.
 */
export function ArticleTracker({ slug, endId }: { slug: string; endId: string }) {
  useEffect(() => {
    track.view(slug);
    const end = document.getElementById(endId);
    if (!end || !("IntersectionObserver" in window)) return;

    const started = Date.now();
    let reachedEnd = false;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) reachedEnd = true;
    });
    io.observe(end);
    const timer = setInterval(() => {
      if (!done && reachedEnd && Date.now() - started >= MIN_READ_SECONDS * 1000) {
        done = true;
        track.read(slug);
        clearInterval(timer);
        io.disconnect();
      }
    }, 2000);
    return () => {
      clearInterval(timer);
      io.disconnect();
    };
  }, [slug, endId]);
  return null;
}


/** Sticky bottom bar on phones (reference .mobile-article-bar). */
export function MobileArticleBar({
  cta,
  href,
  slug,
  saveLabel,
}: {
  cta: string;
  href: string;
  slug: string;
  saveLabel: string;
}) {
  const { t } = useI18n();
  const { share } = useShare();
  return (
    <>
      {/* .mobile-article-bar: phones only; the body makes room for it (globals.css) */}
      <div
        data-article-bar=""
        role="group"
        aria-label={t.article.actions}
        className={cn(
          "hidden print:hidden",
          "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-110 max-md:flex max-md:items-center max-md:gap-2",
          "max-md:border-t max-md:border-border max-md:bg-bg/92 max-md:px-4 max-md:pt-2 max-md:pb-safe-bar max-md:backdrop-blur-md",
        )}
      >
        <Button asChild className={flex.fill}>
          <a href={href}>{cta}</a>
        </Button>
        <BookmarkButton slug={slug} label={saveLabel} variant="icon" className={flex.fixed} />
        <IconButton className={flex.fixed} aria-label={t.share.group} onClick={share}>
          <IconShare />
        </IconButton>
      </div>
    </>
  );
}

/** Long-form chapter rail with scroll-spy (reference `.lf-chapters`). */
export function ChapterNav({ chapters, actions }: { chapters: { id: string; title: string }[]; actions?: React.ReactNode }) {
  const { t, locale } = useI18n();
  const [active, setActive] = useState(chapters[0]?.id);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActive(en.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const ch of chapters) {
      const el = document.getElementById(ch.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [chapters]);

  return (
    // .lf-chapters: sticky beside the story, static once the layout stacks
    <nav aria-label={t.article.chapters} className="sticky top-chapter grid gap-2 max-lg:static">
      <p className="border-b border-border pb-2 text-overline font-650 tracking-overline text-meta uppercase">
        {t.article.chapters}
      </p>
      {chapters.map((ch, i) => (
        // classless in the reference: the base underline under the muted colour
        <a
          key={ch.id}
          href={`#${ch.id}`}
          aria-current={active === ch.id ? "location" : undefined}
          className={cn(
            refLink.underline,
            "grid grid-cols-lead gap-3 border-s-2 border-transparent py-2 ps-3 text-caption text-meta",
            "transition-[color,border-color] duration-180 ease-in-out hover:text-fg",
            active === ch.id && "border-brand font-semibold text-fg",
          )}
        >
          <span className="text-muted-soft tabular-nums">{formatIndex(i + 1, locale)}</span>
          <span>{ch.title}</span>
        </a>
      ))}
      {actions && <div className="mt-6 grid gap-2">{actions}</div>}
    </nav>
  );
}

