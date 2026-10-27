"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState, Notice } from "@/components/patterns/feedback";
import { Badge, Button, Cluster, Container, Heading, Input, Stack, Tag, Text } from "@/components/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notify } from "@/components/ui/sonner";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { dispatch } from "@/lib/admin-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { SUBSCRIBER_STATUSES, type IssueRow, type IssueStatus, type PageInfo, type SubscriberRow, type SubscriberStatus } from "@/types/admin";

const th = "px-4 py-3 text-start text-overline font-650 tracking-overline text-meta uppercase";
const td = "px-4 py-4 align-top text-body-sm text-fg-soft";
const VARIANT: Record<IssueStatus, "boxed" | "opinion" | "default"> = { draft: "boxed", scheduled: "opinion", sending: "opinion", sent: "default" };

/** The Dispatch back office: its issues, and who is on the list. */
export function NewsletterAdmin() {
  const { t } = useI18n();
  const n = t.admin.newsletter;
  return (
    <Container className="py-12">
      <Stack gap={24}>
        <Heading level={1} size="h2">
          {n.title}
        </Heading>
        <Tabs defaultValue="issues">
          <TabsList>
            <TabsTrigger value="issues">{n.tabs.issues}</TabsTrigger>
            <TabsTrigger value="subscribers">{n.tabs.subscribers}</TabsTrigger>
          </TabsList>
          <TabsContent value="issues" className="pt-8">
            <Issues />
          </TabsContent>
          <TabsContent value="subscribers" className="pt-8">
            <Subscribers />
          </TabsContent>
        </Tabs>
      </Stack>
    </Container>
  );
}

function Issues() {
  const { t, locale } = useI18n();
  const n = t.admin.newsletter;
  const router = useRouter();
  const [rows, setRows] = useState<IssueRow[] | null>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let live = true;
    dispatch.issues(page).then(
      (res) => {
        if (!live) return;
        setRows(res.data);
        setInfo(res.page);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [page]);

  const create = async () => {
    setCreating(true);
    try {
      const issue = await dispatch.create({ kind: "friday", subject: "Untitled issue", note: "", articles: [] });
      router.push(routes.adminIssue(issue.id));
    } catch {
      notify(t.form.failed, "error");
      setCreating(false);
    }
  };

  const pages = info ? Math.max(1, Math.ceil(info.total / info.limit)) : 1;
  const kinds = n.kinds as Record<string, string>;

  return (
    <Stack gap={24}>
      <div>
        <Button onClick={create} loading={creating}>
          {n.newIssue}
        </Button>
      </div>
      {failed && <Notice tone="error">{n.loadFailed}</Notice>}
      {rows && rows.length === 0 && !failed && <EmptyState title={n.empty} />}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-panel border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={th}>{n.columns.subject}</th>
                <th scope="col" className={th}>{n.columns.kind}</th>
                <th scope="col" className={th}>{n.columns.status}</th>
                <th scope="col" className={th}>{n.columns.stories}</th>
                <th scope="col" className={th}>{n.columns.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>
                    <Link href={routes.adminIssue(r.id)} className="font-semibold text-fg hover:text-brand">
                      {r.subject}
                    </Link>
                  </td>
                  <td className={td}>{kinds[r.kind]}</td>
                  <td className={td}>
                    <Badge variant={VARIANT[r.status]}>{n.status[r.status]}</Badge>
                    {r.status === "sent" && (
                      <Text as="span" variant="caption" className="ms-2">
                        {formatNumber(r.sent, locale)}
                      </Text>
                    )}
                  </td>
                  <td className={td}>{formatNumber(r.articles.length, locale)}</td>
                  <td className={td}>{formatDateTime(r.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  );
}

function Subscribers() {
  const { t, locale } = useI18n();
  const s = t.admin.newsletter.subscribers;
  const [status, setStatus] = useState<SubscriberStatus | undefined>();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SubscriberRow[] | null>(null);
  const [info, setInfo] = useState<(PageInfo & { counts: Record<string, number> }) | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let live = true;
    dispatch.subscribers({ status, q: query || undefined, page }).then(
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
  }, [status, query, page]);

  const pages = info ? Math.max(1, Math.ceil(info.total / info.limit)) : 1;
  const topics = (list: string[]) => (list.length ? list.join(", ") : s.everything);

  return (
    <Stack gap={24}>
      <Cluster gap={8} role="group" aria-label={t.admin.newsletter.tabs.subscribers}>
        <Tag aria-pressed={status === undefined} onClick={() => { setStatus(undefined); setPage(1); }}>
          {s.all}
        </Tag>
        {SUBSCRIBER_STATUSES.map((st) => (
          <Tag key={st} aria-pressed={status === st} onClick={() => { setStatus(st); setPage(1); }}>
            {s.status[st]}
            {info ? ` (${formatNumber(info.counts[st] ?? 0, locale)})` : ""}
          </Tag>
        ))}
      </Cluster>
      <Input type="search" aria-label={s.search} placeholder={s.search} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-panel" />

      {failed && <Notice tone="error">{t.admin.newsletter.loadFailed}</Notice>}
      {rows && rows.length === 0 && !failed && <EmptyState title={t.admin.newsletter.empty} />}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-panel border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={th}>{s.columns.email}</th>
                <th scope="col" className={th}>{s.columns.status}</th>
                <th scope="col" className={th}>{s.columns.frequency}</th>
                <th scope="col" className={th}>{s.columns.topics}</th>
                <th scope="col" className={th}>{s.columns.source}</th>
                <th scope="col" className={th}>{s.columns.joined}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.email}</td>
                  <td className={td}>{s.status[r.status]}</td>
                  <td className={td}>{s.frequency[r.frequency]}</td>
                  <td className={td}>{topics(r.topics)}</td>
                  <td className={td}>{r.source}</td>
                  <td className={td}>{formatDateTime(r.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {info && (
        <Cluster justify="between" gap={16}>
          <Text variant="meta">{s.total(formatNumber(info.total, locale))}</Text>
          {info.total > info.limit && (
            <Cluster gap={8}>
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
        </Cluster>
      )}
    </Stack>
  );
}
