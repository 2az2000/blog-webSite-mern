"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";

import { notify } from "@/components/ui/sonner";
import { Button, IconBookmark, IconButton, IconHeart, IconLink, IconMail, IconShare } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/config/routes";
import { articleLikes } from "@/lib/reader-api";
import { useAuth } from "@/stores/auth-store";
import { useBookmarks } from "@/stores/bookmarks-store";
import { useFollows } from "@/stores/follows-store";

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

/**
 * Like the article (a heart in the share group). Likes belong to an account:
 * signed out, the button asks for a sign-in and returns the reader to this page.
 * The heart flips at once and undoes itself if the API refuses.
 */
export function LikeArticleButton({ slug, label }: { slug: string; label: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const signedIn = useAuth((s) => s.status === "in");
  const userId = useAuth((s) => s.user?.id);
  const [likedByMe, setLiked] = useState(false);
  // signing out clears the heart without an effect: it simply stops counting
  const liked = signedIn && likedByMe;

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    articleLikes.mine(slug).then(
      (v) => live && setLiked(v),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [slug, signedIn, userId]);

  const toggle = () => {
    if (!signedIn) {
      notify(t.share.signInToLike, "success", { dismissLabel: t.a11y.dismiss });
      router.push(`${routes.signIn()}?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const was = liked;
    setLiked(!was);
    (was ? articleLikes.unlike(slug) : articleLikes.like(slug)).catch(() => setLiked(was));
  };

  return (
    <IconButton
      shape="round"
      toggle
      aria-pressed={liked}
      aria-label={liked ? t.share.unlikeFor(label) : t.share.likeFor(label)}
      onClick={toggle}
    >
      <IconHeart />
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
export function LikeButton({
  count,
  liked: initial = false,
  onToggle,
}: {
  count: number;
  liked?: boolean;
  /** Controlled: the parent owns `liked` and `count` (a real, server-backed like). Without it the like is local. */
  onToggle?: () => void;
}) {
  const { t, locale } = useI18n();
  const [local, setLocal] = useState(initial);
  const liked = onToggle ? initial : local;
  const setLiked = (fn: (v: boolean) => boolean) => (onToggle ? onToggle() : setLocal(fn));
  return (
    <button
      type="button"
      className={cn(commentAction, liked && "font-650 text-brand [&_svg]:animate-pop [&_svg]:fill-current")}
      aria-pressed={liked}
      aria-label={t.comments.like}
      onClick={() => setLiked((v) => !v)}
    >
      <IconHeart />
      <span>{formatNumber(onToggle ? count : count + (liked ? 1 : 0) - (initial ? 1 : 0), locale)}</span>
    </button>
  );
}

/**
 * Follow toggle (topic and author pages): pressed state, label swap, toast.
 * Following belongs to an account: signed out, the button asks for a sign-in
 * and brings the reader back to this page afterwards.
 */
export function FollowButton({
  kind,
  slug,
  name,
  label,
  variant = "primary",
}: {
  kind: "author" | "topic";
  slug: string;
  name: string;
  /** Resting label; defaults to "Follow". */
  label?: string;
  variant?: "primary" | "accent";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const signedIn = useAuth((s) => s.status === "in");
  const on = useFollows((s) => (kind === "author" ? s.authors : s.topics).includes(slug));
  const toggle = useFollows((s) => s.toggle);
  return (
    <Button
      variant={variant}
      aria-pressed={on}
      onClick={() => {
        if (!signedIn) {
          notify(t.follow.signInToFollow, "success", { dismissLabel: t.a11y.dismiss });
          router.push(`${routes.signIn()}?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        toggle(kind, slug).then(
          (now) => notify(now ? t.follow.started(name) : t.follow.stopped(name), "success", { dismissLabel: t.a11y.dismiss }),
          () => notify(t.form.failed, "error", { dismissLabel: t.a11y.dismiss }),
        );
      }}
    >
      {on ? t.follow.following : (label ?? t.follow.follow)}
    </Button>
  );
}
