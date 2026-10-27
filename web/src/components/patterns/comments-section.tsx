"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { commentAction, LikeButton } from "@/components/patterns/actions";
import { Comment } from "@/components/patterns/comment";
import { EmptyState, Notice, panelClass } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
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
import { Avatar, Button, flex, IconFlag, IconReply, Select, Text, Textarea, TextLink } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { comments as api, type CommentPage, type CommentSort, type CommentView } from "@/lib/reader-api";
import { useAuth } from "@/stores/auth-store";

/*
 * The comment thread of an article, live from the API: sort, composer, one level
 * of replies, like / reply / report / edit once / delete. Comments are moderated
 * by people — a held comment is shown to its author, marked as waiting.
 */

type Mode = { kind: "reply"; id: string; name: string } | { kind: "edit"; id: string } | null;
type Reason = "spam" | "abuse" | "off-topic" | "other";

/** Applies `fn` to the comment with `id`, wherever it sits in the thread. */
function patchTree(list: CommentView[], id: string, fn: (c: CommentView) => CommentView): CommentView[] {
  return list.map((c) => (c.id === id ? fn(c) : { ...c, replies: c.replies.map((r) => (r.id === id ? fn(r) : r)) }));
}

export function CommentsSection({ slug, index }: { slug: string; index: number }) {
  const { t, locale } = useI18n();
  const c = t.comments;
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const signedIn = useAuth((s) => s.status === "in");
  const userId = user?.id;

  const [sort, setSort] = useState<CommentSort>("new");
  const [items, setItems] = useState<CommentView[] | null>(null);
  const [info, setInfo] = useState<CommentPage | null>(null);
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const [posting, setPosting] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [reporting, setReporting] = useState<CommentView | null>(null);
  const [reason, setReason] = useState<Reason>("spam");
  const [deleting, setDeleting] = useState<CommentView | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const toastOpts = { dismissLabel: t.a11y.dismiss };

  // The thread differs per reader (their own likes, their held comments), so it reloads when who is reading changes.
  useEffect(() => {
    let live = true;
    api.list(slug, sort, 1).then(
      (res) => {
        if (!live) return;
        setItems(res.data);
        setInfo(res.page);
        setPage(1);
      },
      () => live && setItems((cur) => cur ?? []),
    );
    return () => {
      live = false;
    };
  }, [slug, sort, userId]);

  const loadMore = async () => {
    const res = await api.list(slug, sort, page + 1);
    setItems((cur) => [...(cur ?? []), ...res.data.filter((n) => !(cur ?? []).some((o) => o.id === n.id))]);
    setInfo(res.page);
    setPage(page + 1);
  };

  const needSignIn = useCallback(() => {
    notify(c.signInToComment, "success", toastOpts);
    router.push(`${routes.signIn()}?next=${encodeURIComponent(`${window.location.pathname}#comments`)}`);
  }, [c.signInToComment, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setText("");
    setError(false);
    setMode(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError(true);
      field.current?.focus();
      return;
    }
    if (!signedIn) {
      needSignIn();
      return;
    }
    setError(false);
    setPosting(true);
    try {
      if (mode?.kind === "edit") {
        const saved = await api.edit(mode.id, text);
        setItems((cur) => patchTree(cur ?? [], saved.id, (old) => ({ ...saved, replies: old.replies })));
      } else {
        const saved = await api.post(slug, text, mode?.kind === "reply" ? mode.id : undefined);
        setItems((cur) => {
          const list = cur ?? [];
          if (saved.parent) return patchTree(list, saved.parent, (p) => ({ ...p, replies: [...p.replies, saved] }));
          return sort === "old" ? [...list, saved] : [saved, ...list];
        });
        if (!saved.pending) setInfo((cur) => (cur ? { ...cur, count: cur.count + 1 } : cur));
        notify(saved.pending ? c.held : c.posted, "success", toastOpts);
        reset();
        return;
      }
      notify(c.posted, "success", toastOpts);
      reset();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "DUPLICATE_COMMENT") notify(c.duplicate, "error", toastOpts);
      else if (code === "RATE_LIMITED") notify(c.slowDown, "error", toastOpts);
      else if (code === "EMPTY_COMMENT") setError(true);
      else notify(c.failed, "error", toastOpts);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (cm: CommentView) => {
    if (!signedIn) {
      needSignIn();
      return;
    }
    const was = cm.liked;
    const flip = (liked: boolean, likes: number) => setItems((cur) => patchTree(cur ?? [], cm.id, (x) => ({ ...x, liked, likes })));
    flip(!was, Math.max(0, cm.likes + (was ? -1 : 1)));
    try {
      const res = await (was ? api.unlike(cm.id) : api.like(cm.id));
      flip(res.liked, res.likes);
    } catch {
      flip(was, cm.likes);
    }
  };

  const sendReport = async () => {
    if (!reporting) return;
    try {
      await api.report(reporting.id, reason);
      notify(c.reported, "success", toastOpts);
    } catch (err) {
      // reporting twice, or one's own comment, is not worth an error toast
      if (!(err instanceof ApiError && err.status === 409)) notify(c.failed, "error", toastOpts);
    }
    setReporting(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const gone = deleting;
    try {
      await api.remove(gone.id);
      const res = await api.list(slug, sort, 1);
      setItems(res.data);
      setInfo(res.page);
      setPage(1);
      notify(c.deleted, "success", toastOpts);
    } catch {
      notify(c.failed, "error", toastOpts);
    }
    setDeleting(null);
  };

  const startReply = (cm: CommentView) => {
    setMode({ kind: "reply", id: cm.id, name: cm.author?.name ?? "" });
    document.getElementById("comment-body")?.scrollIntoView({ block: "center" });
    field.current?.focus();
  };

  const startEdit = (cm: CommentView) => {
    setMode({ kind: "edit", id: cm.id });
    setText(cm.body);
    document.getElementById("comment-body")?.scrollIntoView({ block: "center" });
    field.current?.focus();
  };

  const row = (cm: CommentView, reply: boolean) => {
    const removed = cm.removed
      ? cm.removed.by === "moderator"
        ? c.removedModerator(cm.removed.reason)
        : c.removedAuthor
      : null;
    const actions = (
      <>
        {cm.pending ? (
          <Text as="span" variant="caption" className="me-2">
            {c.pendingNote}
          </Text>
        ) : (
          <LikeButton count={cm.likes} liked={cm.liked} onToggle={() => void toggleLike(cm)} />
        )}
        {!cm.pending && (
          <button type="button" className={commentAction} onClick={() => startReply(cm)}>
            <IconReply />
            {c.reply}
          </button>
        )}
        {cm.mine ? (
          <>
            {cm.canEdit && (
              <button type="button" className={commentAction} onClick={() => startEdit(cm)}>
                {c.edit}
              </button>
            )}
            <button type="button" className={commentAction} onClick={() => setDeleting(cm)}>
              {c.delete}
            </button>
          </>
        ) : (
          <button type="button" className={commentAction} onClick={() => (signedIn ? setReporting(cm) : needSignIn())}>
            <IconFlag />
            {c.report}
          </button>
        )}
      </>
    );
    return (
      <Comment
        key={cm.id}
        author={cm.author?.name ?? c.removedName}
        initials={cm.author?.initials ?? "—"}
        tone={cm.author?.badge === "Author" ? "opinion" : undefined}
        badge={cm.pending ? c.pending : cm.author?.badge === "Author" ? c.authorBadge : undefined}
        time={
          <time dateTime={cm.createdAt}>
            {formatRelative(cm.createdAt, locale)}
            {cm.edited ? ` · ${c.edited}` : ""}
          </time>
        }
        likes={cm.likes}
        reply={reply}
        moderated={Boolean(removed)}
        labels={{ reply: c.reply, report: c.report }}
        actions={actions}
      >
        <span className="whitespace-pre-line">{removed ?? cm.body}</span>
      </Comment>
    );
  };

  const total = info?.count ?? 0;
  const hasMore = info ? page * info.limit < info.total : false;
  const you = user?.name ?? c.you;

  return (
    <>
      <SecHead
        index={index}
        id="comments-title"
        locale={locale}
        weight="major"
        title={`${c.title} (${formatNumber(total, locale)})`}
        action={
          <SortMenu
            label={c.sort}
            menuLabel={c.sortLabel}
            value={sort}
            onChange={(k) => {
              setSort(k);
              notify(c.resorted, "success", toastOpts);
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
      <form className={cn(panelClass(), "mb-8")} noValidate onSubmit={submit} onReset={reset}>
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          <Avatar initials={user ? user.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "YO"} size="sm" />
          <Text as="span" variant="meta" className={flex.fill}>
            {c.postingAs} <strong className="font-semibold text-fg normal-nums">{you}</strong>
          </Text>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className={flex.fixed}>
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
        {mode && (
          <div className="mb-4 flex items-center gap-3 text-caption text-meta">
            <span className={flex.fill}>{mode.kind === "reply" ? c.replyingTo(mode.name) : c.editing}</span>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              {c.cancel}
            </Button>
          </div>
        )}
        <Field id="comment-body" label={c.label} required requiredLabel={t.form.required} hint={c.hint} error={error ? c.empty : undefined}>
          <Textarea
            ref={field}
            placeholder={c.placeholder}
            value={text}
            maxLength={2000}
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
            {mode?.kind === "edit" ? c.saveEdit : c.post}
          </Button>
        </div>
      </form>

      {!signedIn && (
        <Notice className="mt-8" bareIcon>
          {c.signedOutLead} <TextLink href={routes.signIn()}>{c.signIn}</TextLink> {c.or}{" "}
          <TextLink href={routes.signUp()}>{c.createAccount}</TextLink> {c.signedOutTail}
        </Notice>
      )}

      {items && items.length > 0 && (
        <div>
          {items.map((cm) => (
            <div key={cm.id}>
              {row(cm, false)}
              {cm.replies.map((r) => row(r, true))}
            </div>
          ))}
        </div>
      )}
      {items && items.length === 0 && (
        <EmptyState mark="“”" title={c.noneTitle}>
          {c.noneBody}
        </EmptyState>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={() => void loadMore()}>
            {c.loadMore}
          </Button>
        </div>
      )}

      <Dialog open={reporting !== null} onOpenChange={(open) => !open && setReporting(null)}>
        <DialogContent>
          <DialogTitle>{c.reportTitle}</DialogTitle>
          <DialogDescription className="mt-4">
            <Select aria-label={c.reportTitle} value={reason} onChange={(e) => setReason(e.target.value as Reason)}>
              {(Object.keys(c.reportReasons) as Reason[]).map((r) => (
                <option key={r} value={r}>
                  {c.reportReasons[r]}
                </option>
              ))}
            </Select>
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{c.cancel}</Button>
            </DialogClose>
            <Button onClick={() => void sendReport()}>{c.reportSubmit}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogTitle>{c.deleteTitle}</DialogTitle>
          <DialogDescription className="mt-4">{c.deleteBody}</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{c.cancel}</Button>
            </DialogClose>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              {c.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
