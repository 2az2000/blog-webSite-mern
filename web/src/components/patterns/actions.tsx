"use client";

import { useState, type ComponentProps, type ReactNode } from "react";

import { notify } from "@/components/ui/sonner";
import { Button, IconBookmark, IconButton, IconHeart, IconLink, IconMail, IconShare } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/stores/bookmarks-store";

/* Reference §11 `.share`, §16 `.bookmark-btn`, §14 like action, and the
   share / copy-link behaviour wired in article.html and longform.html. */

/** Share sheet where the platform has one; otherwise the reference fallback toast. */
export function useShare() {
  const { t } = useI18n();
  const dismissLabel = t.a11y.dismiss;
  return {
    share: () => {
      if (navigator.share) {
        navigator.share({ title: document.title, url: location.href }).catch(() => undefined);
      } else {
        notify(t.share.sheetFallback, "success", { dismissLabel });
      }
    },
    copy: () => {
      navigator.clipboard?.writeText(location.href).catch(() => undefined);
      notify(t.share.linkCopied, "success", { dismissLabel });
    },
  };
}

/** Bookmark toggle state + toast, shared by every bookmark control. */
function useBookmark(slug: string) {
  const { t } = useI18n();
  const saved = useBookmarks((s) => s.slugs.includes(slug));
  const toggle = useBookmarks((s) => s.toggle);
  return {
    saved,
    toggle: () => notify(toggle(slug) ? t.share.saved : t.share.unsaved, "success", { dismissLabel: t.a11y.dismiss }),
  };
}

/**
 * A real toggle: persists to the bookmarks store, flips aria-pressed, fills
 * the glyph and raises a toast. The state survives a reload.
 *
 *   variant="round"  — `.share__btn` in a share group (default)
 *   variant="icon"   — `.icon-btn`, the mobile article bar
 *   variant="button" — a secondary button with a "Save" label (long-form hero)
 */
export function BookmarkButton({
  slug,
  label,
  variant = "round",
  tone,
  className,
}: {
  slug: string;
  /** What is being saved, for the accessible name. */
  label: string;
  variant?: "round" | "icon" | "button";
  /** Ground of the labelled button (the long-form hero is a photograph). */
  tone?: "default" | "photo";
  className?: string;
}) {
  const { t } = useI18n();
  const { saved, toggle } = useBookmark(slug);
  const a11y = {
    "aria-pressed": saved,
    "aria-label": saved ? t.share.removeFor(label) : t.share.saveFor(label),
    onClick: toggle,
  };
  if (variant === "button") {
    return (
      <Button variant="secondary" tone={tone} toggle className={className} {...a11y}>
        <IconBookmark /> {t.share.save}
      </Button>
    );
  }
  if (variant === "icon") {
    return (
      <IconButton toggle className={className} {...a11y}>
        <IconBookmark />
      </IconButton>
    );
  }
  return (
    <IconButton shape="round" toggle className={className} {...a11y}>
      <IconBookmark />
    </IconButton>
  );
}

/** Round share group (article byline): share, copy link, email, and optionally save. */
export function ShareBar({
  title,
  children,
  className,
  ...props
}: ComponentProps<"div"> & { title: string; children?: ReactNode }) {
  const { t } = useI18n();
  const { share, copy } = useShare();
  return (
    <div className={cn("flex items-center gap-1 print:hidden", className)} role="group" aria-label={t.share.group} {...props}>
      <IconButton shape="round" aria-label={t.share.shareSocial} onClick={share}>
        <IconShare />
      </IconButton>
      <IconButton shape="round" aria-label={t.share.copyArticleLink} onClick={copy}>
        <IconLink />
      </IconButton>
      <IconButton
        shape="round"
        aria-label={t.share.email}
        onClick={() => {
          location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(location.href)}`;
        }}
      >
        <IconMail />
      </IconButton>
      {children}
    </div>
  );
}

/** Text buttons for share + copy (long-form chapter rail). */
export function ShareTextButtons() {
  const { t } = useI18n();
  const { share, copy } = useShare();
  return (
    <>
      <Button variant="ghost" size="sm" flush align="start" onClick={copy}>
        <IconLink /> {t.share.copyLink}
      </Button>
      <Button variant="ghost" size="sm" flush align="start" onClick={share}>
        <IconShare /> {t.share.share}
      </Button>
    </>
  );
}

/** .comment__action — the quiet text+icon control under a comment. */
export const commentAction = cn(
  "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-2",
  "text-caption text-meta transition-[color,background-color] duration-180 ease-in-out",
  "hover:bg-surface-sunk hover:text-fg [&_svg]:size-3.75",
);

/** Comment like — optimistic count, pressed state, pop animation (.comment__action.is-liked). */
export function LikeButton({ count, liked: initial = false }: { count: number; liked?: boolean }) {
  const { t, locale } = useI18n();
  const [liked, setLiked] = useState(initial);
  return (
    <button
      type="button"
      className={cn(commentAction, liked && "font-650 text-brand [&_svg]:animate-pop [&_svg]:fill-current")}
      aria-pressed={liked}
      aria-label={t.comments.like}
      onClick={() => setLiked((v) => !v)}
    >
      <IconHeart />
      <span>{formatNumber(count + (liked ? 1 : 0) - (initial ? 1 : 0), locale)}</span>
    </button>
  );
}

/**
 * Follow toggle (topic and author pages): pressed state, label swap, toast.
 * Local state until accounts exist.
 */
export function FollowButton({
  name,
  label,
  variant = "primary",
}: {
  name: string;
  /** Resting label; defaults to "Follow". */
  label?: string;
  variant?: "primary" | "accent";
}) {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  return (
    <Button
      variant={variant}
      aria-pressed={on}
      onClick={() => {
        setOn(!on);
        notify(on ? t.follow.stopped(name) : t.follow.started(name), "success", { dismissLabel: t.a11y.dismiss });
      }}
    >
      {on ? t.follow.following : (label ?? t.follow.follow)}
    </Button>
  );
}
