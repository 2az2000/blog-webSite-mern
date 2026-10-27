"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState, Notice } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import { Button, Cluster, Container, Heading, Input, Stack, Tag, Text } from "@/components/primitives";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { moderation } from "@/lib/admin-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { COMMENT_QUEUES, type CommentQueue, type PageInfo, type QueueComment } from "@/types/admin";

/** The moderators' queue: held and reported comments to read, approve, or remove with a stated reason. */
export function CommentQueueScreen() {
  const { t, locale } = useI18n();
  const q = t.admin.queue;
  const [queue, setQueue] = useState<CommentQueue>("pending");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<QueueComment[] | null>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [removing, setRemoving] = useState<QueueComment | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    moderation.list(queue, page).then(
      (res) => {
        if (!live) return;
        setRows(res.data);
        setInfo(res.page);
        setFailed(false);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [queue, page, tick]);

  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      notify(done, "success");
      setTick((n) => n + 1);
    } catch {
      notify(t.form.failed, "error");
    } finally {
      setBusy(false);
    }
  };

  const pages = info ? Math.max(1, Math.ceil(info.total / info.limit)) : 1;
  const heldFor = q.heldFor as Record<string, string>;

  return (
    <Container className="py-12">
      <Stack gap={24}>
        <Heading level={1} size="h2">
          {q.title}
        </Heading>

        <Cluster gap={8} role="group" aria-label={q.title}>
          {COMMENT_QUEUES.map((name) => (
            <Tag
              key={name}
              aria-pressed={queue === name}
              onClick={() => {
                setQueue(name);
                setPage(1);
                setRows(null);
              }}
            >
              {q.queues[name]}
            </Tag>
          ))}
        </Cluster>

        {failed && <Notice tone="error">{q.loadFailed}</Notice>}
        {rows && rows.length === 0 && !failed && <EmptyState title={q.empty} />}

        <ul className="grid list-none gap-4 p-0">
          {rows?.map((c) => (
            <li key={c.id} className="grid gap-4 rounded-md border border-border bg-surface p-6 max-md:p-4">
              <Cluster gap={12} justify="between" align="baseline">
                <Text as="span" strong>
                  {c.user ? `${c.user.name} · ${c.user.email}` : "—"}
                </Text>
                <Text as="span" variant="meta">
                  {formatDateTime(c.createdAt, locale)}
                </Text>
              </Cluster>
              <Text variant="meta">
                {q.onArticle}{" "}
                <Link href={routes.article(c.article)} className="text-brand underline underline-offset-3">
                  {c.article}
                </Link>
                {c.parent ? ` · ${q.reply}` : ""}
              </Text>

              <Cluster gap={8}>
                {c.heldFor && <Tag>{heldFor[c.heldFor] ?? c.heldFor}</Tag>}
                {c.reportCount > 0 && <Tag>{q.reportCount(formatNumber(c.reportCount, locale))}</Tag>}
                {c.reports.map((r, i) => (
                  <Text key={i} as="span" variant="caption">
                    {r.reason}
                    {r.note ? `: ${r.note}` : ""}
                  </Text>
                ))}
              </Cluster>

              {c.removed ? (
                <Text variant="small" tone="muted">
                  {q.removedBy(c.removed.by)}
                  {c.removed.reason ? ` — ${c.removed.reason}` : ""}
                </Text>
              ) : null}
              <p className="m-0 whitespace-pre-line text-body-sm leading-160 text-fg-soft">{c.body}</p>

              <Cluster gap={8}>
                {(c.status !== "published" || c.reportCount > 0) && c.removed?.by !== "author" && (
                  <Button size="sm" disabled={busy} onClick={() => void act(() => moderation.approve(c.id), q.approved)}>
                    {q.approve}
                  </Button>
                )}
                {c.status !== "removed" && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      setReason("");
                      setRemoving(c);
                    }}
                  >
                    {q.remove}
                  </Button>
                )}
              </Cluster>
            </li>
          ))}
        </ul>

        {info && info.total > info.limit && (
          <Cluster justify="between" gap={16}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t.admin.list.previous}
            </Button>
            <Text variant="meta" as="span">
              {t.admin.list.page(formatNumber(page, locale), formatNumber(pages, locale))}
            </Text>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              {t.admin.list.next}
            </Button>
          </Cluster>
        )}
      </Stack>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogTitle>{q.removeTitle}</DialogTitle>
          <DialogDescription className="mt-4">{q.removeBody}</DialogDescription>
          <Field label={q.reason} className="mt-4">
            <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{q.cancel}</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={!reason.trim() || busy}
              onClick={() => {
                const target = removing;
                setRemoving(null);
                if (target) void act(() => moderation.remove(target.id, reason.trim()), q.removedToast);
              }}
            >
              {q.removeConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
