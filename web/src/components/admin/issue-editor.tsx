"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Notice } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import {
  Button,
  Cluster,
  Container,
  Heading,
  IconArrowDown,
  IconArrowUp,
  IconClose,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
} from "@/components/primitives";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { articles, dispatch } from "@/lib/admin-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { ISSUE_KINDS, type IssueKind, type IssueRow } from "@/types/admin";

import { errorDetails } from "./error-message";

type Option = { slug: string; title: string; kind: string };
type Draft = { kind: IssueKind; subject: string; note: string; articles: string[] };

const toDraft = (i: IssueRow): Draft => ({ kind: i.kind, subject: i.subject, note: i.note, articles: i.articles });
const same = (a: Draft, b: Draft) => a.kind === b.kind && a.subject === b.subject && a.note === b.note && a.articles.join("|") === b.articles.join("|");
const MAX_STORIES = 8;

/** Builds one issue of the Dispatch: edition, subject, the editor's note, up to eight stories — then test, schedule or send. */
export function IssueEditor({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const n = t.admin.newsletter;
  const router = useRouter();
  const kinds = n.kinds as Record<string, string>;
  const articleKinds = t.admin.kinds as Record<string, string>;

  const [issue, setIssue] = useState<IssueRow | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string[] | null>(null);
  const [when, setWhen] = useState("");
  const [confirmSend, setConfirmSend] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([dispatch.issue(id), articles.list({ status: "published", page: 1, limit: 100 })]).then(
      ([i, list]) => {
        if (!live) return;
        setIssue(i);
        setDraft(toDraft(i));
        setOptions(list.data.map((a) => ({ slug: a.slug, title: a.title, kind: a.kind })));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id]);

  if (failed) {
    return (
      <Container className="py-12">
        <Notice tone="error">{n.loadFailed}</Notice>
      </Container>
    );
  }
  if (!issue || !draft) {
    return (
      <Container className="py-12">
        <Text tone="muted" role="status">
          {t.admin.editor.loading}
        </Text>
      </Container>
    );
  }

  const locked = issue.status === "sending" || issue.status === "sent";
  const dirty = !same(draft, toDraft(issue));
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const title = (slug: string) => options.find((o) => o.slug === slug)?.title ?? slug;
  const available = options.filter((o) => !draft.articles.includes(o.slug));
  const move = (i: number, to: number) => {
    const next = [...draft.articles];
    const [item] = next.splice(i, 1);
    next.splice(to, 0, item!);
    set({ articles: next });
  };

  const fail = (err: unknown) =>
    setProblem(err instanceof ApiError ? [err.message, ...errorDetails(err)] : [t.form.failed]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await work();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const adopt = (i: IssueRow) => {
    setIssue(i);
    setDraft(toDraft(i));
  };

  const save = () =>
    run(async () => {
      adopt(await dispatch.update(id, draft));
      notify(n.saved, "success");
    });

  const test = () =>
    run(async () => {
      const res = await dispatch.test(id);
      notify(n.testSent(res.to), "success");
    });

  const schedule = () =>
    run(async () => {
      adopt(await dispatch.schedule(id, new Date(when).toISOString()));
      notify(n.scheduled, "success");
    });

  const unschedule = () =>
    run(async () => {
      adopt(await dispatch.unschedule(id));
      notify(n.unscheduled, "success");
    });

  /** Sends batch after batch until the list runs out; the page shows the running totals. */
  const sendAll = () =>
    run(async () => {
      let current = await dispatch.send(id);
      adopt(current);
      while (current.status === "sending") {
        current = await dispatch.send(id);
        adopt(current);
      }
      notify(n.sentToast, "success");
    });

  const remove = () =>
    run(async () => {
      await dispatch.remove(id);
      notify(n.deleted, "success");
      router.push(routes.adminNewsletter());
    });

  const askToSend = async () => {
    setProblem(null);
    try {
      const res = await dispatch.subscribers({ status: "confirmed", page: 1 });
      setConfirmSend(res.page.total);
    } catch (err) {
      fail(err);
    }
  };

  return (
    <Container className="py-8">
      <Stack gap={24} className="max-w-panel">
        <Link href={routes.adminNewsletter()} className="text-label font-550 text-meta hover:text-fg">
          ← {n.actions.back}
        </Link>

        <Cluster justify="between" gap={16} align="start">
          <Stack gap={8}>
            <Heading level={1} size="h2">
              {draft.subject || n.columns.subject}
            </Heading>
            <Text variant="meta">
              {n.status[issue.status]}
              {issue.scheduledFor ? ` · ${formatDateTime(issue.scheduledFor, locale)}` : ""}
              {issue.sentAt ? ` · ${formatDateTime(issue.sentAt, locale)}` : ""}
            </Text>
          </Stack>
          {!locked && (
            <Button onClick={save} disabled={!dirty || busy} loading={busy}>
              {n.actions.save}
            </Button>
          )}
        </Cluster>

        {locked && <Notice tone="info">{n.locked}</Notice>}
        {issue.status === "sending" && <Notice tone="warning">{n.sending}</Notice>}
        {(issue.status === "sending" || issue.status === "sent") && (
          <Text variant="small">
            {n.progress(formatNumber(issue.sent, locale), formatNumber(issue.failed, locale), formatNumber(issue.skipped, locale))}
          </Text>
        )}
        {problem && (
          <Notice tone="error">
            {problem[0]}
            {problem.length > 1 && (
              <ul className="mt-2 list-disc ps-5">
                {problem.slice(1).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}

        <Field label={n.fields.kind} hint={n.kindHints[draft.kind]}>
          <Select value={draft.kind} disabled={locked} onChange={(e) => set({ kind: e.target.value as IssueKind })}>
            {ISSUE_KINDS.map((k) => (
              <option key={k} value={k}>
                {kinds[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={n.fields.subject}>
          <Input value={draft.subject} maxLength={140} disabled={locked} onChange={(e) => set({ subject: e.target.value })} />
        </Field>
        <Field label={n.fields.note} hint={n.fields.noteHint}>
          <Textarea value={draft.note} maxLength={3000} disabled={locked} onChange={(e) => set({ note: e.target.value })} />
        </Field>

        <Stack gap={12} as="fieldset" className="m-0 border-0 p-0">
          <legend className="text-label font-semibold text-fg">{n.fields.stories}</legend>
          <Text variant="caption">{n.fields.storiesHint}</Text>
          {draft.articles.map((slug, i) => (
            <Cluster key={slug} gap={8} wrap={false}>
              <Select
                aria-label={`${n.fields.stories} ${i + 1}`}
                value={slug}
                disabled={locked}
                onChange={(e) => set({ articles: draft.articles.map((s, j) => (j === i ? e.target.value : s)) })}
              >
                <option value={slug}>{title(slug)}</option>
                {available.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.title} — {articleKinds[o.kind] ?? o.kind}
                  </option>
                ))}
              </Select>
              <Button variant="ghost" size="sm" aria-label={t.admin.body.moveUp} disabled={locked || i === 0} onClick={() => move(i, i - 1)}>
                <IconArrowUp />
              </Button>
              <Button variant="ghost" size="sm" aria-label={t.admin.body.moveDown} disabled={locked || i === draft.articles.length - 1} onClick={() => move(i, i + 1)}>
                <IconArrowDown />
              </Button>
              <Button variant="ghost" size="sm" aria-label={t.admin.frontPage.remove} disabled={locked} onClick={() => set({ articles: draft.articles.filter((_, j) => j !== i) })}>
                <IconClose />
              </Button>
            </Cluster>
          ))}
          {draft.articles.length < MAX_STORIES && (
            <Select
              aria-label={n.fields.add}
              value=""
              disabled={locked}
              onChange={(e) => e.target.value && set({ articles: [...draft.articles, e.target.value] })}
            >
              <option value="">{n.fields.add}</option>
              {available.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.title} — {articleKinds[o.kind] ?? o.kind}
                </option>
              ))}
            </Select>
          )}
        </Stack>

        {!locked && (
          <Stack gap={16} className="rounded-md border border-border bg-surface p-6 max-md:p-4">
            {dirty && <Text variant="caption">{t.admin.editor.saveFirst}</Text>}
            <Cluster gap={8}>
              <Button variant="secondary" size="sm" disabled={dirty || busy} onClick={test}>
                {n.actions.test}
              </Button>
              <Button size="sm" disabled={dirty || busy || draft.articles.length === 0} onClick={() => void askToSend()}>
                {n.actions.sendNow}
              </Button>
              {issue.status === "draft" && (
                <Button variant="danger" size="sm" disabled={busy} onClick={remove}>
                  {n.actions.delete}
                </Button>
              )}
            </Cluster>
            <Cluster gap={8} align="end">
              <Field label={n.actions.scheduleAt}>
                <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </Field>
              <Button variant="secondary" size="sm" disabled={!when || dirty || busy || draft.articles.length === 0} onClick={schedule}>
                {n.actions.schedule}
              </Button>
              {issue.status === "scheduled" && (
                <Button variant="ghost" size="sm" disabled={busy} onClick={unschedule}>
                  {n.actions.unschedule}
                </Button>
              )}
            </Cluster>
          </Stack>
        )}
      </Stack>

      <Dialog open={confirmSend !== null} onOpenChange={(open) => !open && setConfirmSend(null)}>
        <DialogContent>
          <DialogTitle>{n.actions.sendNow}</DialogTitle>
          <DialogDescription className="mt-4">{n.confirmSend(formatNumber(confirmSend ?? 0, locale))}</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{n.cancel}</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setConfirmSend(null);
                void sendAll();
              }}
            >
              {n.sendConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
