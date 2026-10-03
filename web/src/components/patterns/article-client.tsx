"use client";

import { useEffect, useRef, useState } from "react";

import { BookmarkButton, useShare } from "@/components/patterns/actions";
import { Comment } from "@/components/patterns/comment";
import { EmptyState, Notice, panelClass } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import { Pagination } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { SortMenu } from "@/components/patterns/sort-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { Avatar, Button, flex, IconButton, IconShare, refLink, Text, Textarea, TextLink } from "@/components/primitives";
import { routes } from "@/config/routes";
import type { CommentRecord } from "@/data/mock/comments";
import { useI18n } from "@/i18n/i18n-provider";
import { formatIndex, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Interactive reading-surface parts (reference article.html / longform.html scripts). */

type SortKey = "new" | "old" | "top";

/** Comment thread: sort menu, composer with validation, list, empty state. */
export function CommentsSection({ comments: initial, index }: { comments: CommentRecord[]; index: number }) {
  const { t, locale } = useI18n();
  const c = t.comments;
  const [list, setList] = useState(initial);
  const [sort, setSort] = useState<SortKey>("new");
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const [posting, setPosting] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);

  const sorted =
    sort === "old"
      ? [...list].reverse()
      : sort === "top"
        ? [...list].sort((a, b) => (b.moderated ? -1 : b.likes) - (a.moderated ? -1 : a.likes))
        : list;

  const post = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError(true);
      field.current?.focus();
      return;
    }
    setError(false);
    setPosting(true);
    setTimeout(() => {
      setList((l) => [
        {
          id: `local-${Date.now()}`,
          author: c.you,
          initials: "YO",
          badge: "Subscriber",
          time: c.justNow,
          likes: 0,
          body: text.trim(),
        },
        ...l,
      ]);
      setText("");
      setPosting(false);
      notify(c.posted, "success", { dismissLabel: t.a11y.dismiss });
    }, 800);
  };

  return (
    <>
      <SecHead
        index={index}
        id="comments-title"
        locale={locale}
        weight="major"
        title={`${c.title} (${formatNumber(list.length, locale)})`}
        action={
          <SortMenu
            label={c.sort}
            menuLabel={c.sortLabel}
            value={sort}
            onChange={(k) => {
              setSort(k);
              notify(c.resorted, "success", { dismissLabel: t.a11y.dismiss });
            }}
            options={[
              { key: "new", label: c.newest },
              { key: "old", label: c.oldest },
              { key: "top", label: c.mostLiked },
            ]}
          />
        }
      />

      {/* form.panel.comment-composer */}
      <form
        className={cn(panelClass(), "mb-8")}
        noValidate
        onSubmit={post}
        onReset={() => {
          setText("");
          setError(false);
        }}
      >
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          <Avatar initials="YO" size="sm" />
          <Text as="span" variant="meta" className={flex.fill}>
            {c.postingAs} <strong className="font-semibold text-fg normal-nums">{c.you}</strong> · {c.subscriber}
          </Text>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className={flex.fixed}>
                {c.rules}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>{c.rules}</DialogTitle>
              <DialogDescription className="mt-4">{c.rulesBody}</DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{t.a11y.close}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Field id="comment-body" label={c.label} required requiredLabel={t.form.required} hint={c.hint} error={error ? c.empty : undefined}>
          <Textarea
            ref={field}
            placeholder={c.placeholder}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error && e.target.value.trim()) setError(false);
            }}
          />
        </Field>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
          <Button variant="ghost" type="reset">
            {c.clear}
          </Button>
          <Button type="submit" loading={posting}>
            {c.post}
          </Button>
        </div>
      </form>

      <Notice className="mt-8" bareIcon>
        {c.signedOutLead} <TextLink href={routes.signIn()}>{c.signIn}</TextLink> {c.or}{" "}
        <TextLink href={routes.signUp()}>{c.createAccount}</TextLink> {c.signedOutTail}
      </Notice>

      {sorted.length ? (
        <div>
          {sorted.map((cm) => (
            <Comment
              key={cm.id}
              author={cm.author}
              initials={cm.initials}
              tone={cm.badge === "Author" ? "opinion" : undefined}
              badge={cm.badge === "Author" ? c.authorBadge : cm.badge ? c.subscriber : undefined}
              time={cm.time}
              likes={cm.likes}
              reply={cm.reply}
              moderated={cm.moderated}
              labels={{ reply: c.reply, report: c.report }}
            >
              {cm.body}
            </Comment>
          ))}
        </div>
      ) : (
        <EmptyState mark="“”" title={c.noneTitle}>
          {c.noneBody}
        </EmptyState>
      )}

      <Pagination current={1} total={2} locale={locale} hrefFor={() => "#comments"} />
    </>
  );
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

